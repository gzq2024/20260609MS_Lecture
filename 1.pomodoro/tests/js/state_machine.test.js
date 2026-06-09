"use strict";

const {
  STATES,
  EVENTS,
  createInitialContext,
  isLongBreakNext,
  nextState,
  calcRemaining,
} = require("../../static/js/timer/state_machine");

// ----------------------------------------------------------------
// テスト用設定（短時間設定で高速に実行）
// ----------------------------------------------------------------
const TEST_CONFIG = Object.freeze({
  workDuration: 1500,        // 1.5秒
  shortBreakDuration: 300,   // 0.3秒
  longBreakDuration: 600,    // 0.6秒
  sessionsUntilLongBreak: 4,
});

const NOW = 10000; // テスト用の固定時刻

// ----------------------------------------------------------------
// createInitialContext
// ----------------------------------------------------------------
describe("createInitialContext", () => {
  test("completedSessions が 0 である", () => {
    const ctx = createInitialContext(TEST_CONFIG);
    expect(ctx.completedSessions).toBe(0);
  });

  test("endAt が null である", () => {
    const ctx = createInitialContext(TEST_CONFIG);
    expect(ctx.endAt).toBeNull();
  });

  test("config が注入した値と同一である", () => {
    const ctx = createInitialContext(TEST_CONFIG);
    expect(ctx.config).toBe(TEST_CONFIG);
  });
});

// ----------------------------------------------------------------
// isLongBreakNext
// ----------------------------------------------------------------
describe("isLongBreakNext", () => {
  test.each([
    [0, 4, false],  // 1セッション目完了 → 短休憩
    [1, 4, false],  // 2セッション目完了 → 短休憩
    [2, 4, false],  // 3セッション目完了 → 短休憩
    [3, 4, true],   // 4セッション目完了 → 長休憩
    [4, 4, false],  // 5セッション目完了 → 短休憩（リセット後）
    [7, 4, true],   // 8セッション目完了 → 長休憩
  ])("completedSessions=%i, threshold=%i → %s", (completed, threshold, expected) => {
    expect(isLongBreakNext(completed, threshold)).toBe(expected);
  });
});

// ----------------------------------------------------------------
// nextState — STARTイベント
// ----------------------------------------------------------------
describe("nextState / START", () => {
  test("idle → work に遷移する", () => {
    const ctx = createInitialContext(TEST_CONFIG);
    const result = nextState(STATES.IDLE, EVENTS.START, ctx, NOW);
    expect(result.state).toBe(STATES.WORK);
  });

  test("START後のendAtが now + workDuration になる", () => {
    const ctx = createInitialContext(TEST_CONFIG);
    const result = nextState(STATES.IDLE, EVENTS.START, ctx, NOW);
    expect(result.context.endAt).toBe(NOW + TEST_CONFIG.workDuration);
  });

  test("short_break 中に START → work に遷移する", () => {
    const ctx = { ...createInitialContext(TEST_CONFIG), endAt: NOW + 300 };
    const result = nextState(STATES.SHORT_BREAK, EVENTS.START, ctx, NOW);
    expect(result.state).toBe(STATES.WORK);
  });

  test("long_break 中に START → work に遷移する", () => {
    const ctx = { ...createInitialContext(TEST_CONFIG), endAt: NOW + 600 };
    const result = nextState(STATES.LONG_BREAK, EVENTS.START, ctx, NOW);
    expect(result.state).toBe(STATES.WORK);
  });

  test("work 中に START → 状態変化なし（ノーオペレーション）", () => {
    const ctx = { ...createInitialContext(TEST_CONFIG), endAt: NOW + 1500 };
    const result = nextState(STATES.WORK, EVENTS.START, ctx, NOW);
    expect(result.state).toBe(STATES.WORK);
  });
});

// ----------------------------------------------------------------
// nextState — COMPLETEイベント（作業完了）
// ----------------------------------------------------------------
describe("nextState / COMPLETE from work", () => {
  test("1回目完了 → short_break に遷移する", () => {
    const ctx = { ...createInitialContext(TEST_CONFIG), completedSessions: 0 };
    const result = nextState(STATES.WORK, EVENTS.COMPLETE, ctx, NOW);
    expect(result.state).toBe(STATES.SHORT_BREAK);
  });

  test("2回目完了 → short_break に遷移する", () => {
    const ctx = { ...createInitialContext(TEST_CONFIG), completedSessions: 1 };
    const result = nextState(STATES.WORK, EVENTS.COMPLETE, ctx, NOW);
    expect(result.state).toBe(STATES.SHORT_BREAK);
  });

  test("3回目完了 → short_break に遷移する", () => {
    const ctx = { ...createInitialContext(TEST_CONFIG), completedSessions: 2 };
    const result = nextState(STATES.WORK, EVENTS.COMPLETE, ctx, NOW);
    expect(result.state).toBe(STATES.SHORT_BREAK);
  });

  test("4回目完了 → long_break に遷移する", () => {
    const ctx = { ...createInitialContext(TEST_CONFIG), completedSessions: 3 };
    const result = nextState(STATES.WORK, EVENTS.COMPLETE, ctx, NOW);
    expect(result.state).toBe(STATES.LONG_BREAK);
  });

  test("8回目完了 → long_break に遷移する", () => {
    const ctx = { ...createInitialContext(TEST_CONFIG), completedSessions: 7 };
    const result = nextState(STATES.WORK, EVENTS.COMPLETE, ctx, NOW);
    expect(result.state).toBe(STATES.LONG_BREAK);
  });

  test("completedSessions がインクリメントされる", () => {
    const ctx = { ...createInitialContext(TEST_CONFIG), completedSessions: 0 };
    const result = nextState(STATES.WORK, EVENTS.COMPLETE, ctx, NOW);
    expect(result.context.completedSessions).toBe(1);
  });

  test("短休憩の endAt が now + shortBreakDuration になる", () => {
    const ctx = { ...createInitialContext(TEST_CONFIG), completedSessions: 0 };
    const result = nextState(STATES.WORK, EVENTS.COMPLETE, ctx, NOW);
    expect(result.context.endAt).toBe(NOW + TEST_CONFIG.shortBreakDuration);
  });

  test("長休憩の endAt が now + longBreakDuration になる", () => {
    const ctx = { ...createInitialContext(TEST_CONFIG), completedSessions: 3 };
    const result = nextState(STATES.WORK, EVENTS.COMPLETE, ctx, NOW);
    expect(result.context.endAt).toBe(NOW + TEST_CONFIG.longBreakDuration);
  });
});

// ----------------------------------------------------------------
// nextState — COMPLETEイベント（休憩完了）
// ----------------------------------------------------------------
describe("nextState / COMPLETE from break", () => {
  test("short_break 完了 → idle に遷移する", () => {
    const ctx = { ...createInitialContext(TEST_CONFIG), completedSessions: 1 };
    const result = nextState(STATES.SHORT_BREAK, EVENTS.COMPLETE, ctx, NOW);
    expect(result.state).toBe(STATES.IDLE);
  });

  test("long_break 完了 → idle に遷移する", () => {
    const ctx = { ...createInitialContext(TEST_CONFIG), completedSessions: 4 };
    const result = nextState(STATES.LONG_BREAK, EVENTS.COMPLETE, ctx, NOW);
    expect(result.state).toBe(STATES.IDLE);
  });

  test("休憩完了後の endAt が null になる", () => {
    const ctx = { ...createInitialContext(TEST_CONFIG), completedSessions: 1, endAt: NOW };
    const result = nextState(STATES.SHORT_BREAK, EVENTS.COMPLETE, ctx, NOW);
    expect(result.context.endAt).toBeNull();
  });
});

// ----------------------------------------------------------------
// nextState — RESETイベント
// ----------------------------------------------------------------
describe("nextState / RESET", () => {
  test.each([
    STATES.IDLE,
    STATES.WORK,
    STATES.SHORT_BREAK,
    STATES.LONG_BREAK,
    STATES.PAUSED,
  ])("どの状態からも idle に戻る（state=%s）", (fromState) => {
    const ctx = { ...createInitialContext(TEST_CONFIG), completedSessions: 3 };
    const result = nextState(fromState, EVENTS.RESET, ctx, NOW);
    expect(result.state).toBe(STATES.IDLE);
  });

  test("RESET後に completedSessions が 0 にリセットされる", () => {
    const ctx = { ...createInitialContext(TEST_CONFIG), completedSessions: 3 };
    const result = nextState(STATES.WORK, EVENTS.RESET, ctx, NOW);
    expect(result.context.completedSessions).toBe(0);
  });

  test("RESET後に endAt が null になる", () => {
    const ctx = { ...createInitialContext(TEST_CONFIG), endAt: NOW + 1500 };
    const result = nextState(STATES.WORK, EVENTS.RESET, ctx, NOW);
    expect(result.context.endAt).toBeNull();
  });
});

// ----------------------------------------------------------------
// nextState — 不変条件（純粋関数の確認）
// ----------------------------------------------------------------
describe("nextState / 純粋関数の確認", () => {
  test("元の context オブジェクトを変更しない", () => {
    const ctx = createInitialContext(TEST_CONFIG);
    const originalCompleted = ctx.completedSessions;
    nextState(STATES.WORK, EVENTS.COMPLETE, ctx, NOW);
    expect(ctx.completedSessions).toBe(originalCompleted);
  });

  test("同じ引数で呼ぶと常に同じ結果を返す", () => {
    const ctx = createInitialContext(TEST_CONFIG);
    const r1 = nextState(STATES.IDLE, EVENTS.START, ctx, NOW);
    const r2 = nextState(STATES.IDLE, EVENTS.START, ctx, NOW);
    expect(r1.state).toBe(r2.state);
    expect(r1.context.endAt).toBe(r2.context.endAt);
  });
});

// ----------------------------------------------------------------
// calcRemaining
// ----------------------------------------------------------------
describe("calcRemaining", () => {
  test("endAt が null のとき workDuration を返す", () => {
    expect(calcRemaining(null, NOW, TEST_CONFIG)).toBe(TEST_CONFIG.workDuration);
  });

  test("endAt - now の差分を返す", () => {
    expect(calcRemaining(NOW + 1000, NOW, TEST_CONFIG)).toBe(1000);
  });

  test("0秒ちょうどで 0 を返す", () => {
    expect(calcRemaining(NOW, NOW, TEST_CONFIG)).toBe(0);
  });

  test("endAt が過去（タイムオーバー）でも 0 を返す（負にならない）", () => {
    expect(calcRemaining(NOW - 500, NOW, TEST_CONFIG)).toBe(0);
  });

  test("タブ復帰で大幅に時間が過ぎた場合も 0 を返す", () => {
    expect(calcRemaining(NOW - 99999, NOW, TEST_CONFIG)).toBe(0);
  });
});

// ----------------------------------------------------------------
// 連続シナリオテスト（4セッション分の通し確認）
// ----------------------------------------------------------------
describe("4セッション通しシナリオ", () => {
  test("work→short_break を3回繰り返した後、4回目で long_break になる", () => {
    let state = STATES.IDLE;
    let ctx = createInitialContext(TEST_CONFIG);
    let now = 0;

    for (let i = 0; i < 3; i++) {
      // 作業開始
      ({ state, context: ctx } = nextState(state, EVENTS.START, ctx, now));
      expect(state).toBe(STATES.WORK);

      // 作業完了
      now += TEST_CONFIG.workDuration;
      ({ state, context: ctx } = nextState(state, EVENTS.COMPLETE, ctx, now));
      expect(state).toBe(STATES.SHORT_BREAK);

      // 休憩完了
      now += TEST_CONFIG.shortBreakDuration;
      ({ state, context: ctx } = nextState(state, EVENTS.COMPLETE, ctx, now));
      expect(state).toBe(STATES.IDLE);
    }

    // 4回目の作業
    ({ state, context: ctx } = nextState(state, EVENTS.START, ctx, now));
    now += TEST_CONFIG.workDuration;
    ({ state, context: ctx } = nextState(state, EVENTS.COMPLETE, ctx, now));
    expect(state).toBe(STATES.LONG_BREAK);
    expect(ctx.completedSessions).toBe(4);
  });
});
