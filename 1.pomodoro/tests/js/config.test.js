"use strict";

const {
  DEFAULT_CONFIG,
  WORK_DURATION_OPTIONS,
  BREAK_DURATION_OPTIONS,
  THEME_OPTIONS,
  DEFAULT_SOUND_SETTINGS,
  createConfig,
} = require("../../static/js/timer/config");

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

describe("customization options", () => {
  test("作業時間の選択肢が15/25/35/45分", () => {
    expect(WORK_DURATION_OPTIONS).toEqual([15, 25, 35, 45]);
  });

  test("休憩時間の選択肢が5/10/15分", () => {
    expect(BREAK_DURATION_OPTIONS).toEqual([5, 10, 15]);
  });

  test("テーマ選択肢がlight/dark/focus", () => {
    expect(THEME_OPTIONS).toEqual(["light", "dark", "focus"]);
  });

  test("サウンド初期値は開始・終了オン、tickオフ", () => {
    expect(DEFAULT_SOUND_SETTINGS).toEqual({
      start: true,
      end: true,
      tick: false,
    });
  });

  test("createConfigで作業/休憩時間をカスタムできる", () => {
    const config = createConfig(45, 10);
    expect(config.workDuration).toBe(45 * 60 * 1000);
    expect(config.shortBreakDuration).toBe(10 * 60 * 1000);
    expect(config.longBreakDuration).toBe(10 * 60 * 1000);
    expect(config.sessionsUntilLongBreak).toBe(4);
  });
});
