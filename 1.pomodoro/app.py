from flask import Flask, render_template, request, jsonify
from datetime import datetime, timezone
from models import Session
from session_repository import SqliteSessionRepository

app = Flask(__name__)

# Repository 初期化
repo = SqliteSessionRepository()


@app.route("/")
def index():
    return render_template("index.html")


# ----------------------------------------------------------------
# API: POST /api/sessions — セッション完了記録
# ----------------------------------------------------------------
@app.route("/api/sessions", methods=["POST"])
def create_session():
    """
    セッション完了情報を受け取り、DBに保存する。

    リクエストボディ:
    {
        "session_type": "work" | "short_break" | "long_break",
        "started_at": <Unix timestamp (ms)>,
        "ended_at": <Unix timestamp (ms)>,
        "focus_minutes": <int>
    }

    レスポンス:
    - 正常: 201 { "id": <id>, "session_type": "...", ... }
    - 異常: 400 { "error": "..." }
    """
    try:
        data = request.get_json(force=True, silent=True)

        # バリデーション
        if not data or not isinstance(data, dict):
            return jsonify({"error": "Request body is required"}), 400

        required_fields = ["session_type", "started_at", "ended_at", "focus_minutes"]
        for field in required_fields:
            if field not in data:
                return jsonify({"error": f"Missing required field: {field}"}), 400

        # 型チェック
        if not isinstance(data.get("started_at"), int) or not isinstance(data.get("ended_at"), int):
            return jsonify({"error": "started_at and ended_at must be integers (ms)"}), 400

        if not isinstance(data.get("focus_minutes"), int):
            return jsonify({"error": "focus_minutes must be an integer"}), 400

        session_type = data["session_type"]
        if session_type not in ["work", "short_break", "long_break"]:
            return jsonify({"error": "Invalid session_type"}), 400

        # セッション作成
        session = Session(
            session_type=session_type,
            started_at=data["started_at"],
            ended_at=data["ended_at"],
            focus_minutes=data["focus_minutes"],
            created_at=datetime.now(timezone.utc),
        )

        # 保存
        saved = repo.save(session)

        return jsonify(saved.to_dict()), 201

    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ----------------------------------------------------------------
# API: GET /api/stats/today — 当日の集計
# ----------------------------------------------------------------
@app.route("/api/stats/today", methods=["GET"])
def get_today_stats():
    """
    当日の統計情報を返す。

    レスポンス:
    {
        "completed": <作業セッション完了数>,
        "focus_minutes": <累計集中時間（分）>
    }
    """
    try:
        stats = repo.get_today_stats()
        return jsonify(stats), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    app.run(debug=True, port=5000)


