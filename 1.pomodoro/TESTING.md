# E2E テスト手順 (End-to-End Testing)

本ドキュメントでは、Pomodoro タイマーアプリの動作確認方法を記載します。

## 準備

### サーバー起動

```bash
cd /workspaces/20260609MS_Lecture/1.pomodoro
python app.py
```

ブラウザで `http://localhost:5000` にアクセス。

## テストケース

### Phase 6-2 最小 E2E チェックリスト

- [ ] 開始 → 完了 → 休憩 → 作業 の通し動作を確認
- [ ] セッション完了時に同一データが二重記録されないことを確認
- [ ] セッション中にリロードして状態復元されることを確認
- [ ] モバイル幅（360px / 390px 目安）で余白・文字・ボタン操作性を確認

---

### TC-1: 基本動作確認

**目的**: タイマー表示と状態遷移が正常に動作することを確認

**手順**:
1. ページロード直後、タイマーが "25:00" を表示していることを確認
2. モードラベルが "仕事" を表示していることを確認
3. 統計情報欄が "完了: 0" "フォーカス時間: 0分" を表示していることを確認

**検証**:
- ✓ 表示が正確
- ✓ レイアウトが整っている

---

### TC-2: 本番 WORK セッション実行

**目的**: 25分のセッション実行とデータベース保存を確認

**手順**:
1. START ボタンをクリック
2. タイマーがカウントダウンを開始することを確認 (25:00 → 24:59 → ...)
3. SVG リング（プログレスバー）が徐々に埋まることを確認
4. **デバッグ確認**: ブラウザのコンソール (F12) を開き、以下を確認
   - `[Pomodoro] START button clicked` ログ
   - `[Pomodoro] State saved to localStorage` ログ

**検証**:
- ✓ タイマーがカウントダウン中
- ✓ リングが徐々に埋まる
- ✓ ブラウザコンソールにデバッグログが出力

---

### TC-3: localStorage 永続化テスト

**目的**: ページ再読み込み後も状態が復元されることを確認

**手順**:
1. TC-2 の途中（例: 20:00 のとき）で一度ページをリロード (F5 キー)
2. ページ再読み込み後、以下を確認
   - タイマーが 20:00 周辺の値を表示している
   - モードが「仕事」のままである
   - **デバッグログ**: `[Pomodoro] State loaded from localStorage` ログ

**検証**:
- ✓ 状態が復元された
- ✓ カウントダウンが継続する

---

### TC-4: セッション完了と統計表示

**目的**: セッション完了時に API が呼び出され、統計が更新されることを確認

**手順** (オプション: テスト用に高速化):
1. ブラウザのコンソール (F12) で以下を実行して、タイマーを高速化
   ```javascript
   // config.js の設定を一時的に変更（開発用）
   // 実際の運用では使用しないこと
   ```
   
2. または、**通常運用時**:
   - 実際の 25 分待つ（または、FastClock を使ったテストを参照）
   - タイマーが 00:00 に到達
   - モードが自動的に「短い休憩」に切り替わる
   - **デバッグログ確認**:
     - `[Pomodoro] Session completed`
     - `[Pomodoro] Saving work session`
     - `[Pomodoro] Session saved successfully`
     - `[Pomodoro] Loading stats from /api/stats/today`
     - `[Pomodoro] Stats loaded`

3. 統計情報欄が更新されることを確認
   - 「完了: 1」
   - 「フォーカス時間: 25分」

**検証**:
- ✓ API が成功（ステータス 201）
- ✓ 統計が正確に更新された
- ✓ 短い休憩に自動遷移

---

### TC-5: RESET ボタンテスト

**目的**: RESET ボタンが正常に動作し、localStorage がクリアされることを確認

**手順**:
1. セッション実行中に RESET ボタンをクリック
2. 以下を確認
   - タイマーが 25:00 にリセット
   - モードが「仕事」に戻る
   - **デバッグログ**: `[Pomodoro] RESET button clicked` ログ
   - localStorage から状態が削除される
3. ページをリロード (F5)
4. タイマーが 25:00 を表示していることを確認（状態が復元されない）

**検証**:
- ✓ RESET 正常動作
- ✓ localStorage がクリアされた

---

### TC-6: ネットワークエラーハンドリング

**目的**: ネットワーク障害時のエラーハンドリングを確認

**手順**:
1. ブラウザの開発者ツール (F12) > Network パネルを開く
2. Network Throttling を "Offline" に設定
3. START ボタンをクリック
4. タイマーがカウントダウンを開始することを確認（UI は動作）
5. **ネットワーク復帰後**:
   - Network Throttling を "Online" に戻す
   - ページをリロード
   - 統計情報が正常に読み込まれることを確認

**検証**:
- ✓ UI はオフライン中も動作
- ✓ ネットワーク復帰後に正常化
- ✓ エラーがコンソールに出力される（graceful degradation）

---

### TC-7: 複数セッションサイクル

**目的**: 4 セッション達成後に長休憩に遷移することを確認

**手順** (実際に 100 分以上必要、またはテストコードを使用):
1. 4 回の WORK セッションを完了
2. 4 番目の セッション完了後、モードが「長い休憩」に遷移することを確認
3. ブラウザコンソールを確認
   - `[Pomodoro] Session completed` ログに `completedSessions: 4` が含まれる

**検証**:
- ✓ 長休憩へ正常遷移
- ✓ completedSessions カウンタが正確

---

## 自動テスト実行

### Python テスト (Flask API)

```bash
cd /workspaces/20260609MS_Lecture/1.pomodoro
python -m pytest tests/python/ -v
```

**期待結果**: 37 PASS

### JavaScript テスト (タイマーロジック)

```bash
cd /workspaces/20260609MS_Lecture/1.pomodoro
npm test
```

**期待結果**: 93 PASS, 97.33% coverage

---

## デバッグモード制御

`app.js` の先頭で DEBUG フラグを制御:

```javascript
const DEBUG = true;  // ログ出力有効
const DEBUG = false; // ログ出力無効
```

---

## データベース確認

SQLite データベースを確認:

```bash
sqlite3 /workspaces/20260609MS_Lecture/1.pomodoro/pomodoro.db

# テーブル確認
.tables

# セッション一覧
SELECT * FROM sessions;

# 本日のセッション統計
SELECT 
  SUM(CASE WHEN session_type='work' THEN focus_minutes ELSE 0 END) as focus_minutes,
  COUNT(CASE WHEN session_type='work' THEN 1 END) as completed
FROM sessions 
WHERE DATE(created_at) = DATE('now');
```

---

## トラブルシューティング

### タイマーがカウントダウンしない

1. ブラウザコンソールでエラーを確認
2. `app.js` の import パスが正確か確認
3. ローカルサーバーが起動しているか確認: `curl http://localhost:5000`

### 統計情報が更新されない

1. ブラウザコンソールの `[Pomodoro] Loading stats` ログを確認
2. API が 200 ステータスを返しているか確認（ネットワークタブ）
3. `GET /api/stats/today` の応答形式を確認

### localStorage が動作しない

1. ブラウザが localStorage をサポートしているか確認
2. シークレットウィンドウでテスト（プライベートモード無効の確認）
3. ブラウザコンソールで手動確認:
   ```javascript
   localStorage.getItem("pomodoroAppState")
   ```

---

## まとめ

| テストケース | 自動化 | 手動確認 |
|-------------|------|--------|
| 基本動作 | ✓ (pytest) | TC-1 |
| WORK セッション | ✗ | TC-2 |
| localStorage 永続化 | ✓ (state_machine) | TC-3 |
| セッション完了・統計 | ✓ (test_api.py) | TC-4 |
| RESET | ✓ (state_machine) | TC-5 |
| エラーハンドリング | ✗ | TC-6 |
| 複数セッション | ✓ (full_pomodoro_cycle) | TC-7 |

**本運用前に、少なくとも TC-1, TC-2, TC-4, TC-5 を実施してください。**
