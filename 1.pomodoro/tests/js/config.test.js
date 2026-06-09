"use strict";

const { DEFAULT_CONFIG, createConfig } = require("../../static/js/timer/config");

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

describe("createConfig", () => {
  test("sessionsUntilLongBreak を注入できる", () => {
    const config = createConfig({ sessionsUntilLongBreak: 6 });
    expect(config.sessionsUntilLongBreak).toBe(6);
  });

  test("未指定の値はデフォルトを使う", () => {
    const config = createConfig({ sessionsUntilLongBreak: 6 });
    expect(config.workDuration).toBe(25 * 60 * 1000);
    expect(config.shortBreakDuration).toBe(5 * 60 * 1000);
    expect(config.longBreakDuration).toBe(15 * 60 * 1000);
  });

  test("生成された設定オブジェクトはイミュータブルである（Frozen）", () => {
    expect(Object.isFrozen(createConfig({ sessionsUntilLongBreak: 6 }))).toBe(true);
  });
});
