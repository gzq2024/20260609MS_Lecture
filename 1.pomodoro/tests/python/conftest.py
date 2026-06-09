"""
conftest.py — pytest設定

sys.pathに 1.pomodoro/ を追加し、
テストから `from app import app` で参照できるようにする。
テスト毎にリポジトリを初期化する autouse fixture も定義。
"""
import sys
import os
import pytest

# 1.pomodoro/app.py をインポートできるようにパスを追加
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))


@pytest.fixture(autouse=True)
def _init_test_repo(monkeypatch):
    """
    テスト毎にappモジュールのリポジトリをリセットする。
    autouse=True なので全テストに自動適用される。
    """
    import app as app_module
    from session_repository import InMemorySessionRepository
    
    repo = InMemorySessionRepository()
    # app モジュールのグローバル repo を置き換える
    monkeypatch.setattr(app_module, "repo", repo)


