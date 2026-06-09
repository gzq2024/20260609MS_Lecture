"""
session_repository.py — セッション永続化レイヤー

Repository パターンで本番実装（SQLite）とテスト実装（InMemory）を切り替え可能にする。
"""
import sqlite3
from datetime import datetime, date, timedelta, timezone
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

    @abstractmethod
    def get_gamification_stats(self) -> dict:
        """ゲーミフィケーション統計を返す"""
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

    def get_all_sessions(self) -> list:
        """全セッション一覧"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        cursor.execute("""
            SELECT id, session_type, started_at, ended_at, focus_minutes, created_at
            FROM session
            ORDER BY created_at DESC
        """)
        rows = cursor.fetchall()
        conn.close()
        return [self._row_to_session(row) for row in rows]

    def get_gamification_stats(self) -> dict:
        """XP/レベル/ストリーク/バッジ/週次月次統計"""
        sessions = self.get_all_sessions()
        return _build_gamification_stats(sessions)

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
        session.id = self.next_id
        self.sessions[self.next_id] = session
        self.next_id += 1
        return session

    def get_by_id(self, session_id: int) -> Session:
        """IDでセッションを取得"""
        return self.sessions.get(session_id)

    def get_today_sessions(self) -> list:
        """当日のセッション"""
        today = datetime.now(timezone.utc).date()
        return [s for s in self.sessions.values() if s.created_at.date() == today]

    def get_today_stats(self) -> dict:
        """統計情報"""
        sessions = self.get_today_sessions()
        completed_count = len(sessions)
        focus_minutes = sum(s.focus_minutes for s in sessions if s.session_type == "work")

        return {
            "completed": completed_count,
            "focus_minutes": focus_minutes,
        }

    def get_gamification_stats(self) -> dict:
        """XP/レベル/ストリーク/バッジ/週次月次統計"""
        sessions = list(self.sessions.values())
        return _build_gamification_stats(sessions)


def _build_gamification_stats(sessions: list) -> dict:
    """セッション一覧からゲーミフィケーション情報を構築する。"""
    work_sessions = [s for s in sessions if s.session_type == "work"]
    total_work_sessions = len(work_sessions)
    total_focus_minutes = sum(s.focus_minutes for s in work_sessions)
    total_sessions = len(sessions)

    xp = total_work_sessions * 10 + total_focus_minutes
    level = max(1, (xp // 100) + 1)
    next_level_xp = level * 100

    today = datetime.now(timezone.utc).date()
    week_start = today - timedelta(days=today.weekday())
    month_start = today.replace(day=1)

    # ストリーク（今日を含む連続日数）
    work_dates = sorted({s.created_at.date() for s in work_sessions}, reverse=True)
    streak = 0
    cursor_date = today
    for d in work_dates:
        if d == cursor_date:
            streak += 1
            cursor_date = cursor_date - timedelta(days=1)
        elif d > cursor_date:
            continue
        else:
            break

    weekly_work = [s for s in work_sessions if s.created_at.date() >= week_start]
    monthly_work = [s for s in work_sessions if s.created_at.date() >= month_start]

    badges = []
    if total_work_sessions >= 1:
        badges.append("初回完了")
    if streak >= 3:
        badges.append("3日連続")
    if len(weekly_work) >= 10:
        badges.append("今週10回完了")

    avg_focus_minutes = round(total_focus_minutes / total_work_sessions, 1) if total_work_sessions else 0
    completion_rate = round((total_work_sessions / total_sessions) * 100, 1) if total_sessions else 0

    weekly_graph = []
    for i in range(7):
        day = week_start + timedelta(days=i)
        day_sessions = [s for s in work_sessions if s.created_at.date() == day]
        weekly_graph.append({
            "date": day.isoformat(),
            "label": day.strftime("%m/%d"),
            "completed": len(day_sessions),
            "focus_minutes": sum(s.focus_minutes for s in day_sessions),
        })

    if today.month == 12:
        next_month_start = today.replace(year=today.year + 1, month=1, day=1)
    else:
        next_month_start = today.replace(month=today.month + 1, day=1)
    days_in_month = (next_month_start - month_start).days

    monthly_graph = []
    for i in range(days_in_month):
        day = month_start + timedelta(days=i)
        day_sessions = [s for s in work_sessions if s.created_at.date() == day]
        monthly_graph.append({
            "date": day.isoformat(),
            "label": day.strftime("%d"),
            "completed": len(day_sessions),
            "focus_minutes": sum(s.focus_minutes for s in day_sessions),
        })

    return {
        "xp": xp,
        "level": level,
        "next_level_xp": next_level_xp,
        "streak_days": streak,
        "badges": badges,
        "weekly": {
            "completed": len(weekly_work),
            "focus_minutes": sum(s.focus_minutes for s in weekly_work),
            "completion_rate": completion_rate,
            "average_focus_minutes": avg_focus_minutes,
            "graph": weekly_graph,
        },
        "monthly": {
            "completed": len(monthly_work),
            "focus_minutes": sum(s.focus_minutes for s in monthly_work),
            "completion_rate": completion_rate,
            "average_focus_minutes": avg_focus_minutes,
            "graph": monthly_graph,
        },
    }
