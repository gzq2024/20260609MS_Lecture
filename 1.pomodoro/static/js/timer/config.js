/**
 * config.js — タイマー設定オブジェクト
 *
 * テスト時は短時間設定を注入することで高速テストを可能にする。
 * 単位はすべてミリ秒。
 */

/** @typedef {Object} PomodoroConfig
 * @property {number} workDuration       作業時間 (ms)
 * @property {number} shortBreakDuration 短休憩時間 (ms)
 * @property {number} longBreakDuration  長休憩時間 (ms)
 * @property {number} sessionsUntilLongBreak 長休憩に切り替わる作業セッション数
 */

/** デフォルト設定（本番用） */
const DEFAULT_CONFIG = Object.freeze({
  workDuration: 25 * 60 * 1000,       // 25分
  shortBreakDuration: 5 * 60 * 1000,  // 5分
  longBreakDuration: 15 * 60 * 1000,  // 15分
  sessionsUntilLongBreak: 4,
});

const WORK_DURATION_OPTIONS = Object.freeze([15, 25, 35, 45]);
const BREAK_DURATION_OPTIONS = Object.freeze([5, 10, 15]);
const THEME_OPTIONS = Object.freeze(["light", "dark", "focus"]);

const DEFAULT_SOUND_SETTINGS = Object.freeze({
  start: true,
  end: true,
  tick: false,
});

function createConfig(workMinutes = 25, breakMinutes = 5) {
  return {
    ...DEFAULT_CONFIG,
    workDuration: workMinutes * 60 * 1000,
    shortBreakDuration: breakMinutes * 60 * 1000,
    longBreakDuration: breakMinutes * 60 * 1000,
  };
}

module.exports = {
  DEFAULT_CONFIG,
  WORK_DURATION_OPTIONS,
  BREAK_DURATION_OPTIONS,
  THEME_OPTIONS,
  DEFAULT_SOUND_SETTINGS,
  createConfig,
};
