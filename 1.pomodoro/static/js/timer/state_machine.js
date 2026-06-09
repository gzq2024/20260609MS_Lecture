/**
 * state_machine.js — タイマー状態機械（純粋関数）
 *
 * ■ 状態 (State)
 *   idle        : 初期状態・リセット後
 *   work        : 作業中
 *   short_break : 短休憩中
 *   long_break  : 長休憩中
 *   paused      : 一時停止中
 *
 * ■ イベント (Event)
 *   START    : タイマー開始
 *   RESET    : 初期状態へ戻す
 *   COMPLETE : カウントダウン完了（0秒到達）
 *
 * ■ コンテキスト (Context)
 *   completedSessions : 完了した作業セッション数（長休憩判定に使用）
 *   endAt             : カウントダウン終了予定時刻 (ms)
 *   config            : PomodoroConfig
 *
 * ■ 設計原則
 *   - nextState() は副作用なし（純粋関数）
 *   - 未定義の遷移は現在の state をそのまま返す（サイレントノーオペレーション）
 */

const STATES = Object.freeze({
  IDLE: "idle",
  WORK: "work",
  SHORT_BREAK: "short_break",
  LONG_BREAK: "long_break",
  PAUSED: "paused",
});

const EVENTS = Object.freeze({
  START: "START",
  RESET: "RESET",
  COMPLETE: "COMPLETE",
});

/**
 * 初期コンテキストを生成する。
 * @param {import('./config').PomodoroConfig} config
 * @returns {Object}
 */
function createInitialContext(config) {
  return {
    completedSessions: 0,
    endAt: null,
    config,
  };
}

/**
 * 次の作業セッション完了後に長休憩になるかを判定する。
 * @param {number} completedSessions
 * @param {number} sessionsUntilLongBreak
 * @returns {boolean}
 */
function isLongBreakNext(completedSessions, sessionsUntilLongBreak) {
  return (completedSessions + 1) % sessionsUntilLongBreak === 0;
}

/**
 * 状態遷移を計算して新しい [state, context] を返す純粋関数。
 *
 * @param {string} state   現在の状態 (STATES のいずれか)
 * @param {string} event   発生したイベント (EVENTS のいずれか)
 * @param {Object} context 現在のコンテキスト
 * @param {number} now     現在時刻 (ms) — Clock.now() の値を渡す
 * @returns {{ state: string, context: Object }}
 */
function nextState(state, event, context, now) {
  const { config } = context;

  switch (event) {
    // ------------------------------------------------------------------
    // START: idle から work へ遷移
    // ------------------------------------------------------------------
    case EVENTS.START: {
      if (state === STATES.IDLE) {
        return {
          state: STATES.WORK,
          context: {
            ...context,
            endAt: now + config.workDuration,
          },
        };
      }
      // short_break / long_break 中に START → 次の作業を開始
      if (state === STATES.SHORT_BREAK || state === STATES.LONG_BREAK) {
        return {
          state: STATES.WORK,
          context: {
            ...context,
            endAt: now + config.workDuration,
          },
        };
      }
      break;
    }

    // ------------------------------------------------------------------
    // COMPLETE: カウントダウン 0 秒到達
    // ------------------------------------------------------------------
    case EVENTS.COMPLETE: {
      if (state === STATES.WORK) {
        const newCompleted = context.completedSessions + 1;
        const goLong = isLongBreakNext(
          context.completedSessions,
          config.sessionsUntilLongBreak
        );
        const breakDuration = goLong
          ? config.longBreakDuration
          : config.shortBreakDuration;
        const nextBreakState = goLong
          ? STATES.LONG_BREAK
          : STATES.SHORT_BREAK;

        return {
          state: nextBreakState,
          context: {
            ...context,
            completedSessions: newCompleted,
            endAt: now + breakDuration,
          },
        };
      }

      if (state === STATES.SHORT_BREAK || state === STATES.LONG_BREAK) {
        return {
          state: STATES.IDLE,
          context: {
            ...context,
            endAt: null,
          },
        };
      }
      break;
    }

    // ------------------------------------------------------------------
    // RESET: 任意の状態から idle へ戻す
    // ------------------------------------------------------------------
    case EVENTS.RESET: {
      return {
        state: STATES.IDLE,
        context: {
          ...context,
          completedSessions: 0,
          endAt: null,
        },
      };
    }

    default:
      break;
  }

  // 未定義の遷移: 現状を維持
  return { state, context };
}

/**
 * 残り時間 (ms) を計算する。
 * endAt が null の場合は config.workDuration を返す。
 *
 * @param {number|null} endAt  終了予定時刻 (ms)
 * @param {number}      now    現在時刻 (ms)
 * @param {import('./config').PomodoroConfig} config
 * @returns {number} 残り時間 (ms)、最小値は 0
 */
function calcRemaining(endAt, now, config) {
  if (endAt === null) return config.workDuration;
  return Math.max(0, endAt - now);
}

module.exports = {
  STATES,
  EVENTS,
  createInitialContext,
  isLongBreakNext,
  nextState,
  calcRemaining,
};
