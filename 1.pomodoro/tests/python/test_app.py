"""
Phase 1 — Flask エントリポイントのユニットテスト

テスト対象:
- GET / のHTTPレスポンス
- レスポンスHTMLに含まれる主要要素
- 静的ファイル参照（CSS / JS）
"""
import pytest
from app import app as flask_app


# ----------------------------------------------------------------
# フィクスチャ
# ----------------------------------------------------------------
@pytest.fixture
def client():
    """Flaskテストクライアントを返す。"""
    flask_app.config["TESTING"] = True
    with flask_app.test_client() as c:
        yield c


# ----------------------------------------------------------------
# GET / — レスポンス基本確認
# ----------------------------------------------------------------
class TestIndexRoute:
    def test_status_200(self, client):
        """GET / は HTTP 200 を返す。"""
        res = client.get("/")
        assert res.status_code == 200

    def test_content_type_is_html(self, client):
        """レスポンスの Content-Type は text/html を含む。"""
        res = client.get("/")
        assert "text/html" in res.content_type

    def test_charset_is_utf8(self, client):
        """レスポンスのエンコーディングは utf-8 である。"""
        res = client.get("/")
        assert "utf-8" in res.content_type.lower()

    def test_unknown_route_returns_404(self, client):
        """存在しないパスは 404 を返す。"""
        res = client.get("/unknown")
        assert res.status_code == 404


# ----------------------------------------------------------------
# GET / — HTML構造確認
# ----------------------------------------------------------------
class TestIndexHtmlStructure:
    """レスポンスHTMLにモック準拠の主要要素が含まれることを確認する。"""

    @pytest.fixture(autouse=True)
    def html(self, client):
        self.body = client.get("/").data.decode("utf-8")

    # --- ヘッダー ---
    def test_contains_app_title(self):
        """ヘッダーにアプリ名が含まれる。"""
        assert "ポモドーロタイマー" in self.body

    # --- モード表示 ---
    def test_contains_mode_label(self):
        """モード表示ラベルが含まれる。"""
        assert "作業中" in self.body

    def test_mode_label_has_id(self):
        """モード表示ラベルに id="modeLabel" が設定されている。"""
        assert 'id="modeLabel"' in self.body

    # --- タイマー表示 ---
    def test_contains_initial_timer_text(self):
        """初期表示のタイマー文字列 25:00 が含まれる。"""
        assert "25:00" in self.body

    def test_timer_text_has_id(self):
        """タイマーテキスト要素に id="timerText" が設定されている。"""
        assert 'id="timerText"' in self.body

    # --- SVGプログレスリング ---
    def test_contains_svg_ring(self):
        """SVGリング要素が含まれる。"""
        assert "<svg" in self.body

    def test_ring_progress_has_id(self):
        """プログレスリングに id="ringProgress" が設定されている。"""
        assert 'id="ringProgress"' in self.body

    # --- 操作ボタン ---
    def test_contains_start_button(self):
        """開始ボタンが含まれる。"""
        assert "開始" in self.body

    def test_start_button_has_id(self):
        """開始ボタンに id="startBtn" が設定されている。"""
        assert 'id="startBtn"' in self.body

    def test_contains_reset_button(self):
        """リセットボタンが含まれる。"""
        assert "リセット" in self.body

    def test_reset_button_has_id(self):
        """リセットボタンに id="resetBtn" が設定されている。"""
        assert 'id="resetBtn"' in self.body

    # --- 進捗カード ---
    def test_contains_progress_card_title(self):
        """今日の進捗カードのタイトルが含まれる。"""
        assert "今日の進捗" in self.body

    def test_completed_count_has_id(self):
        """完了件数要素に id="completedCount" が設定されている。"""
        assert 'id="completedCount"' in self.body

    def test_focus_time_has_id(self):
        """集中時間要素に id="focusTime" が設定されている。"""
        assert 'id="focusTime"' in self.body

    # --- カスタマイズ設定 ---
    def test_work_duration_selector_exists(self):
        """作業時間セレクタが含まれる。"""
        assert 'id="workDurationSelect"' in self.body
        assert "15分" in self.body
        assert "45分" in self.body

    def test_break_duration_selector_exists(self):
        """休憩時間セレクタが含まれる。"""
        assert 'id="breakDurationSelect"' in self.body
        assert "10分" in self.body

    def test_theme_selector_exists(self):
        """テーマセレクタが含まれる。"""
        assert 'id="themeSelect"' in self.body
        assert "ライト" in self.body
        assert "ダーク" in self.body
        assert "フォーカス" in self.body

    def test_sound_toggles_exist(self):
        """サウンド設定トグルが含まれる。"""
        assert 'id="soundStartToggle"' in self.body
        assert 'id="soundEndToggle"' in self.body
        assert 'id="soundTickToggle"' in self.body

    # --- 静的ファイル参照 ---
    def test_links_stylesheet(self):
        """CSSファイルへのリンクが含まれる。"""
        assert "style.css" in self.body

    def test_links_javascript(self):
        """JavaScriptファイルへの参照が含まれる。"""
        assert "app.js" in self.body

    def test_has_viewport_meta(self):
        """モバイル対応のviewportメタタグが含まれる。"""
        assert 'name="viewport"' in self.body

    def test_lang_is_ja(self):
        """htmlタグのlang属性が日本語に設定されている。"""
        assert 'lang="ja"' in self.body
