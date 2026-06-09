"use strict";

const { DEFAULT_CONFIG } = require("../../static/js/timer/config");

describe("DEFAULT_CONFIG", () => {
  test("作業時間が25分（ミリ秒）である", () => {
    expect(DEFAULT_CONFIG.workDuration).toBe(25 * 60 * 1000);
  });

  test("短休憩が5分（ミリ秒）である", () => {
    expect(DEFAULT_CONFIG.shortBreakDuration).toBe(5 * 60 * 1000);
  });

  test("長休憩が15分（ミリ秒）である", () => {
    expect(DEFAULT_CONFIG.longBreakDuration).toBe(15 * 60 * 1000);
  });

  test("長休憩までのセッション数が4である", () => {
    expect(DEFAULT_CONFIG.sessionsUntilLongBreak).toBe(4);
  });

  test("設定オブジェクトがイミュータブルである（Frozen）", () => {
    expect(Object.isFrozen(DEFAULT_CONFIG)).toBe(true);
  });
});
