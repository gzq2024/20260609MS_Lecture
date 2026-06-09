"""
models.py — セッションモデル定義

SQLite の session テーブルに対応したシンプルなモデル。
"""
from datetime import datetime


class Session:
    """ポモドーロセッションモデル"""

    def __init__(
        self,
        session_type: str,
        started_at: int,
        ended_at: int,
        focus_minutes: int,
        created_at: datetime = None,
        id: int = None,
    ):
        """
        Args:
            session_type: "work" | "short_break" | "long_break"
            started_at: Unix timestamp (ms)
            ended_at: Unix timestamp (ms)
            focus_minutes: 実際の作業時間（分）
            created_at: レコード作成時刻。Noneの場合は現在時刻。
            id: DB内のID。新規作成時はNone。
        """
        self.id = id
        self.session_type = session_type
        self.started_at = started_at
        self.ended_at = ended_at
        self.focus_minutes = focus_minutes
        self.created_at = created_at or datetime.utcnow()

    def to_dict(self):
        """辞書形式で返す（JSON シリアライズ用）"""
        return {
            "id": self.id,
            "session_type": self.session_type,
            "started_at": self.started_at,
            "ended_at": self.ended_at,
            "focus_minutes": self.focus_minutes,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }

    @classmethod
    def from_dict(cls, data: dict):
        """辞書から Session を生成"""
        return cls(
            session_type=data["session_type"],
            started_at=data["started_at"],
            ended_at=data["ended_at"],
            focus_minutes=data["focus_minutes"],
            created_at=data.get("created_at"),
            id=data.get("id"),
        )
