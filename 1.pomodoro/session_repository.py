"""
session_repository.py — セッション永続化レイヤー

Repository パターンで本番実装（SQLite）とテスト実装（InMemory）を切り替え可能にする。
"""
import sqlite3
from datetime import datetime, date
from abc import ABC, abstractmethod
from models import Session


class SessionRepository(ABC):
    """セッション永続化の抽象インターフェース"""

    @abstractmethod
    def save(self, session: Session) -> Session:
        """セッションを保存し、ID付きセッションを返す"""
        pass

    @abstractmethod
    def get_by_id(self, session_id: int) -> Session:
        """IDでセッションを取得"""
        pass

    @abstractmethod
    def get_today_sessions(self) -> list:
        """当日のセッション一覧を取得"""
        pass

    @abstractmethod
    def get_today_stats(self) -> dict:
        """当日の統計（完了件数、集中時間）を返す"""
        pass


class SqliteSessionRepository(SessionRepository):
    """SQLite 実装"""

    def __init__(self, db_path: str = "pomodoro.db"):
        self.db_path = db_path
        self._init_db()

    def _init_db(self):
        """テーブルを初期化"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS session (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                session_type TEXT NOT NULL,
                started_at INTEGER NOT NULL,
                ended_at INTEGER NOT NULL,
                focus_minutes INTEGER NOT NULL,
                created_at TEXT NOT NULL
            )
        """)
        conn.commit()
        conn.close()

    def save(self, session: Session) -> Session:
        """セッションを保存"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()

        # 重複保存防止: 同じセッション内容が既に存在する場合は既存レコードを返す
        cursor.execute("""
            SELECT id, session_type, started_at, ended_at, focus_minutes, created_at
            FROM session
            WHERE session_type = ?
              AND started_at = ?
              AND ended_at = ?
              AND focus_minutes = ?
            LIMIT 1
        """, (
            session.session_type,
            session.started_at,
            session.ended_at,
            session.focus_minutes,
        ))
        existing = cursor.fetchone()
        if existing:
            conn.close()
            return self._row_to_session(existing)

        cursor.execute("""
            INSERT INTO session (session_type, started_at, ended_at, focus_minutes, created_at)
            VALUES (?, ?, ?, ?, ?)
        """, (
            session.session_type,
            session.started_at,
            session.ended_at,
            session.focus_minutes,
            session.created_at.isoformat(),
        ))
        conn.commit()
        session_id = cursor.lastrowid
        conn.close()

        session.id = session_id
        return session

    def get_by_id(self, session_id: int) -> Session:
        """IDでセッションを取得"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        cursor.execute("""
            SELECT id, session_type, started_at, ended_at, focus_minutes, created_at
            FROM session WHERE id = ?
        """, (session_id,))
        row = cursor.fetchone()
        conn.close()

        if not row:
            return None
        return self._row_to_session(row)

    def get_today_sessions(self) -> list:
        """当日のセッション一覧"""
        today_start = datetime.combine(date.today(), datetime.min.time()).isoformat()
        today_end = datetime.combine(date.today(), datetime.max.time()).isoformat()

        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        cursor.execute("""
            SELECT id, session_type, started_at, ended_at, focus_minutes, created_at
            FROM session
            WHERE created_at BETWEEN ? AND ?
            ORDER BY created_at DESC
        """, (today_start, today_end))
        rows = cursor.fetchall()
        conn.close()

        return [self._row_to_session(row) for row in rows]

    def get_today_stats(self) -> dict:
        """当日の統計"""
        sessions = self.get_today_sessions()
        completed_count = len(sessions)
        focus_minutes = sum(s.focus_minutes for s in sessions if s.session_type == "work")

        return {
            "completed": completed_count,
            "focus_minutes": focus_minutes,
        }

    @staticmethod
    def _row_to_session(row) -> Session:
        """SQLite行をセッションオブジェクトに変換"""
        session_id, session_type, started_at, ended_at, focus_minutes, created_at_str = row
        created_at = datetime.fromisoformat(created_at_str) if created_at_str else None
        return Session(
            session_type=session_type,
            started_at=started_at,
            ended_at=ended_at,
            focus_minutes=focus_minutes,
            created_at=created_at,
            id=session_id,
        )


class InMemorySessionRepository(SessionRepository):
    """テスト用 In-Memory 実装"""

    def __init__(self):
        self.sessions = {}
        self.next_id = 1

    def save(self, session: Session) -> Session:
        """セッションを保存"""
        for existing in self.sessions.values():
            if (
                existing.session_type == session.session_type
                and existing.started_at == session.started_at
                and existing.ended_at == session.ended_at
                and existing.focus_minutes == session.focus_minutes
            ):
                return existing

        session.id = self.next_id
        self.sessions[self.next_id] = session
        self.next_id += 1
        return session

    def get_by_id(self, session_id: int) -> Session:
        """IDでセッションを取得"""
        return self.sessions.get(session_id)

    def get_today_sessions(self) -> list:
        """当日のセッション（この実装では全セッション）"""
        return list(self.sessions.values())

    def get_today_stats(self) -> dict:
        """統計情報"""
        sessions = self.get_today_sessions()
        completed_count = len(sessions)
        focus_minutes = sum(s.focus_minutes for s in sessions if s.session_type == "work")

        return {
            "completed": completed_count,
            "focus_minutes": focus_minutes,
        }
