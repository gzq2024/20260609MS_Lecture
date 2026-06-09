"use strict";

const {
  shouldAutoResumeCountdown,
  shouldCompleteExpiredCountdown,
} = require("../../static/js/timer/persistence");
const { STATES } = require("../../static/js/timer/state_machine");

describe("persistence helpers", () => {
  const NOW = 1000;

  test("カウントダウン中で endAt が未来なら復帰後に再開する", () => {
    expect(shouldAutoResumeCountdown(STATES.WORK, NOW + 100, NOW)).toBe(true);
    expect(shouldAutoResumeCountdown(STATES.SHORT_BREAK, NOW + 100, NOW)).toBe(true);
    expect(shouldAutoResumeCountdown(STATES.LONG_BREAK, NOW + 100, NOW)).toBe(true);
  });

  test("カウントダウン中で endAt が過去なら復帰後に完了処理する", () => {
    expect(shouldCompleteExpiredCountdown(STATES.WORK, NOW - 1, NOW)).toBe(true);
    expect(shouldCompleteExpiredCountdown(STATES.SHORT_BREAK, NOW - 1, NOW)).toBe(true);
    expect(shouldCompleteExpiredCountdown(STATES.LONG_BREAK, NOW - 1, NOW)).toBe(true);
  });

  test("idle や endAt 不正値では再開/完了判定しない", () => {
    expect(shouldAutoResumeCountdown(STATES.IDLE, NOW + 100, NOW)).toBe(false);
    expect(shouldCompleteExpiredCountdown(STATES.IDLE, NOW - 1, NOW)).toBe(false);
    expect(shouldAutoResumeCountdown(STATES.WORK, null, NOW)).toBe(false);
    expect(shouldCompleteExpiredCountdown(STATES.WORK, null, NOW)).toBe(false);
  });
});
