"use strict";

const { IntervalScheduler, ManualScheduler } = require("../../static/js/timer/scheduler");

// ----------------------------------------------------------------
// ManualScheduler
// ----------------------------------------------------------------
describe("ManualScheduler", () => {
  test("start() 後に isRunning() が true を返す", () => {
    const s = new ManualScheduler();
    s.start(() => {});
    expect(s.isRunning()).toBe(true);
  });

  test("stop() 後に isRunning() が false を返す", () => {
    const s = new ManualScheduler();
    s.start(() => {});
    s.stop();
    expect(s.isRunning()).toBe(false);
  });

  test("tick() でコールバックが1回呼ばれる", () => {
    const s = new ManualScheduler();
    const fn = jest.fn();
    s.start(fn);
    s.tick();
    expect(fn).toHaveBeenCalledTimes(1);
  });

  test("tick() を3回呼ぶとコールバックが3回呼ばれる", () => {
    const s = new ManualScheduler();
    const fn = jest.fn();
    s.start(fn);
    s.tick();
    s.tick();
    s.tick();
    expect(fn).toHaveBeenCalledTimes(3);
  });

  test("callCount が tick() 回数と一致する", () => {
    const s = new ManualScheduler();
    s.start(() => {});
    s.tick();
    s.tick();
    expect(s.callCount).toBe(2);
  });

  test("stop() 後に tick() してもコールバックが呼ばれない", () => {
    const s = new ManualScheduler();
    const fn = jest.fn();
    s.start(fn);
    s.stop();
    s.tick();
    expect(fn).toHaveBeenCalledTimes(0);
  });

  test("start() を再呼び出しすると callCount がリセットされる", () => {
    const s = new ManualScheduler();
    s.start(() => {});
    s.tick();
    s.tick();
    s.start(() => {});
    expect(s.callCount).toBe(0);
  });
});

// ----------------------------------------------------------------
// IntervalScheduler (Jest fake timers を使用)
// ----------------------------------------------------------------
describe("IntervalScheduler", () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  test("start() 後に isRunning() が true を返す", () => {
    const s = new IntervalScheduler();
    s.start(() => {}, 1000);
    expect(s.isRunning()).toBe(true);
    s.stop();
  });

  test("stop() 後に isRunning() が false を返す", () => {
    const s = new IntervalScheduler();
    s.start(() => {}, 1000);
    s.stop();
    expect(s.isRunning()).toBe(false);
  });

  test("指定間隔でコールバックが呼ばれる", () => {
    const s = new IntervalScheduler();
    const fn = jest.fn();
    s.start(fn, 1000);
    jest.advanceTimersByTime(3000);
    expect(fn).toHaveBeenCalledTimes(3);
    s.stop();
  });

  test("stop() 後はコールバックが呼ばれない", () => {
    const s = new IntervalScheduler();
    const fn = jest.fn();
    s.start(fn, 1000);
    s.stop();
    jest.advanceTimersByTime(3000);
    expect(fn).toHaveBeenCalledTimes(0);
  });
});
