"""
tests/python/test_api.py — Flask API テスト

POST /api/sessions と GET /api/stats/today の正常系・異常系・境界値をテストする。
"""
import pytest
from datetime import datetime
import sys
import os

# app.py, models.py, session_repository.py をインポートできるようにパスを追加
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))

from app import app as flask_app
from models import Session
from session_repository import InMemorySessionRepository


@pytest.fixture
def client():
    """テスト用Flaskクライアント（リポジトリはconftest.pyで初期化）"""
    flask_app.config["TESTING"] = True
    with flask_app.test_client() as c:
        yield c


# ================================================================
# POST /api/sessions — セッション完了記録
# ================================================================
class TestCreateSession:
    """セッション作成API"""

    def test_status_201_on_success(self, client):
        """正常系: 201 Created を返す"""
        res = client.post(
            "/api/sessions",
            json={
                "session_type": "work",
                "started_at": 0,
                "ended_at": 1500000,
                "focus_minutes": 25,
            },
        )
        assert res.status_code == 201

    def test_returns_session_object(self, client):
        """正常系: レスポンスがセッションオブジェクトを含む"""
        res = client.post(
            "/api/sessions",
            json={
                "session_type": "work",
                "started_at": 0,
                "ended_at": 1500000,
                "focus_minutes": 25,
            },
        )
        data = res.get_json()
        assert data["id"] is not None
        assert data["session_type"] == "work"
        assert data["started_at"] == 0
        assert data["ended_at"] == 1500000
        assert data["focus_minutes"] == 25

    def test_returns_401_on_missing_body(self, client):
        """異常系: リクエストボディなし → 400"""
        res = client.post("/api/sessions")
        assert res.status_code == 400
        assert "error" in res.get_json()

    def test_returns_400_on_missing_field(self, client):
        """異常系: 必須フィールド欠落 → 400"""
        res = client.post(
            "/api/sessions",
            json={
                "session_type": "work",
                "started_at": 0,
                # ended_at 欠落
                "focus_minutes": 25,
            },
        )
        assert res.status_code == 400
        assert "Missing required field" in res.get_json()["error"]

    def test_returns_400_on_invalid_timestamp_type(self, client):
        """異常系: タイムスタンプが文字列 → 400"""
        res = client.post(
            "/api/sessions",
            json={
                "session_type": "work",
                "started_at": "0",  # 文字列
                "ended_at": 1500000,
                "focus_minutes": 25,
            },
        )
        assert res.status_code == 400
        assert "must be integers" in res.get_json()["error"]

    def test_returns_400_on_invalid_focus_minutes_type(self, client):
        """異常系: focus_minutes が文字列 → 400"""
        res = client.post(
            "/api/sessions",
            json={
                "session_type": "work",
                "started_at": 0,
                "ended_at": 1500000,
                "focus_minutes": "25",  # 文字列
            },
        )
        assert res.status_code == 400
        assert "focus_minutes must be an integer" in res.get_json()["error"]

    def test_returns_400_on_invalid_session_type(self, client):
        """異常系: session_type が不正 → 400"""
        res = client.post(
            "/api/sessions",
            json={
                "session_type": "invalid_type",
                "started_at": 0,
                "ended_at": 1500000,
                "focus_minutes": 25,
            },
        )
        assert res.status_code == 400
        assert "Invalid session_type" in res.get_json()["error"]

    def test_accepts_short_break(self, client):
        """正常系: short_break タイプを受け入れる"""
        res = client.post(
            "/api/sessions",
            json={
                "session_type": "short_break",
                "started_at": 1500000,
                "ended_at": 1800000,
                "focus_minutes": 5,
            },
        )
        assert res.status_code == 201
        assert res.get_json()["session_type"] == "short_break"

    def test_accepts_long_break(self, client):
        """正常系: long_break タイプを受け入れる"""
        res = client.post(
            "/api/sessions",
            json={
                "session_type": "long_break",
                "started_at": 5400000,
                "ended_at": 6300000,
                "focus_minutes": 15,
            },
        )
        assert res.status_code == 201
        assert res.get_json()["session_type"] == "long_break"

    def test_returns_0_on_zero_focus_minutes(self, client):
        """境界値: focus_minutes が 0 を受け入れる"""
        res = client.post(
            "/api/sessions",
            json={
                "session_type": "work",
                "started_at": 0,
                "ended_at": 1500000,
                "focus_minutes": 0,
            },
        )
        assert res.status_code == 201
        assert res.get_json()["focus_minutes"] == 0

    def test_prevents_duplicate_session_save(self, client):
        """正常系: 同一セッションの重複保存を防止"""
        payload = {
            "session_type": "work",
            "started_at": 0,
            "ended_at": 1500000,
            "focus_minutes": 25,
        }

        first = client.post("/api/sessions", json=payload)
        second = client.post("/api/sessions", json=payload)

        assert first.status_code == 201
        assert second.status_code == 201
        assert first.get_json()["id"] == second.get_json()["id"]

        stats = client.get("/api/stats/today").get_json()
        assert stats["completed"] == 1
        assert stats["focus_minutes"] == 25


# ================================================================
# GET /api/stats/today — 当日集計
# ================================================================
class TestGetTodayStats:
    """統計API"""

    def test_returns_empty_stats_initially(self, client):
        """初期状態: 件数0、時間0を返す"""
        res = client.get("/api/stats/today")
        assert res.status_code == 200
        data = res.get_json()
        assert data["completed"] == 0
        assert data["focus_minutes"] == 0

    def test_counts_saved_sessions(self, client):
        """正常系: 保存したセッションを数える"""
        # セッション1を保存
        client.post(
            "/api/sessions",
            json={
                "session_type": "work",
                "started_at": 0,
                "ended_at": 1500000,
                "focus_minutes": 25,
            },
        )
        # セッション2を保存
        client.post(
            "/api/sessions",
            json={
                "session_type": "short_break",
                "started_at": 1500000,
                "ended_at": 1800000,
                "focus_minutes": 5,
            },
        )

        res = client.get("/api/stats/today")
        assert res.status_code == 200
        data = res.get_json()
        assert data["completed"] == 2

    def test_sums_focus_minutes_for_work_only(self, client):
        """正常系: 作業セッションの時間だけ合算"""
        # work 25分
        client.post(
            "/api/sessions",
            json={
                "session_type": "work",
                "started_at": 0,
                "ended_at": 1500000,
                "focus_minutes": 25,
            },
        )
        # short_break 5分
        client.post(
            "/api/sessions",
            json={
                "session_type": "short_break",
                "started_at": 1500000,
                "ended_at": 1800000,
                "focus_minutes": 5,
            },
        )
        # work 20分
        client.post(
            "/api/sessions",
            json={
                "session_type": "work",
                "started_at": 1800000,
                "ended_at": 3000000,
                "focus_minutes": 20,
            },
        )

        res = client.get("/api/stats/today")
        data = res.get_json()
        # work のみ: 25 + 20 = 45分
        assert data["focus_minutes"] == 45
        # セッション総数: 3
        assert data["completed"] == 3

    def test_ignores_long_break_focus_minutes(self, client):
        """正常系: long_break の focus_minutes を除外"""
        client.post(
            "/api/sessions",
            json={
                "session_type": "work",
                "started_at": 0,
                "ended_at": 1500000,
                "focus_minutes": 25,
            },
        )
        client.post(
            "/api/sessions",
            json={
                "session_type": "long_break",
                "started_at": 5400000,
                "ended_at": 6300000,
                "focus_minutes": 15,  # この15分は除外されるべき
            },
        )

        res = client.get("/api/stats/today")
        data = res.get_json()
        assert data["focus_minutes"] == 25  # work のみ


# ================================================================
# 統合シナリオ
# ================================================================
class TestIntegration:
    """エンドツーエンドシナリオテスト"""

    def test_full_pomodoro_cycle(self, client):
        """1セッション分のフロー確認"""
        # 1. work セッション完了
        res1 = client.post(
            "/api/sessions",
            json={
                "session_type": "work",
                "started_at": 1000,
                "ended_at": 1501000,
                "focus_minutes": 25,
            },
        )
        assert res1.status_code == 201
        session_id = res1.get_json()["id"]
        assert session_id is not None

        # 2. 統計確認
        res2 = client.get("/api/stats/today")
        stats = res2.get_json()
        assert stats["completed"] == 1
        assert stats["focus_minutes"] == 25

        # 3. short_break セッション完了
        res3 = client.post(
            "/api/sessions",
            json={
                "session_type": "short_break",
                "started_at": 1501000,
                "ended_at": 1801000,
                "focus_minutes": 5,
            },
        )
        assert res3.status_code == 201

        # 4. 最終統計確認
        res4 = client.get("/api/stats/today")
        final_stats = res4.get_json()
        assert final_stats["completed"] == 2
        assert final_stats["focus_minutes"] == 25  # work のみ
