"use strict";

const { SystemClock, FakeClock } = require("../../static/js/timer/clock");

// ----------------------------------------------------------------
// SystemClock
// ----------------------------------------------------------------
describe("SystemClock", () => {
  test("now() が数値を返す", () => {
    const clock = new SystemClock();
    expect(typeof clock.now()).toBe("number");
  });

  test("now() が Date.now() と近似値を返す", () => {
    const clock = new SystemClock();
    const before = Date.now();
    const result = clock.now();
    const after = Date.now();
    expect(result).toBeGreaterThanOrEqual(before);
    expect(result).toBeLessThanOrEqual(after);
  });
});

// ----------------------------------------------------------------
// FakeClock
// ----------------------------------------------------------------
describe("FakeClock", () => {
  test("初期時刻 0 で now() が 0 を返す", () => {
    const clock = new FakeClock();
    expect(clock.now()).toBe(0);
  });

  test("初期時刻を指定して now() がその値を返す", () => {
    const clock = new FakeClock(1000);
    expect(clock.now()).toBe(1000);
  });

  test("tick() で時刻が加算される", () => {
    const clock = new FakeClock(1000);
    clock.tick(500);
    expect(clock.now()).toBe(1500);
  });

  test("tick() を複数回呼ぶと累積される", () => {
    const clock = new FakeClock(0);
    clock.tick(100);
    clock.tick(200);
    clock.tick(300);
    expect(clock.now()).toBe(600);
  });

  test("setTime() で任意の時刻に変更できる", () => {
    const clock = new FakeClock(1000);
    clock.setTime(9999);
    expect(clock.now()).toBe(9999);
  });

  test("setTime() 後に tick() が正しく機能する", () => {
    const clock = new FakeClock(0);
    clock.setTime(5000);
    clock.tick(200);
    expect(clock.now()).toBe(5200);
  });
});
