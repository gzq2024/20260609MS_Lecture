/**
 * @jest-environment jsdom
 */
"use strict";

const {
  render,
  buildViewModel,
  formatTime,
  RING_CIRCUMFERENCE,
} = require("../../static/js/timer/presenter");

// ----------------------------------------------------------------
// formatTime
// ----------------------------------------------------------------
describe("formatTime", () => {
  test.each([
    [25 * 60 * 1000,        "25:00"],
    [5  * 60 * 1000,        "05:00"],
    [90 * 1000,             "01:30"],
    [1000,                  "00:01"],
    [0,                     "00:00"],
    [500,                   "00:01"],  // ceil なので切り上げ
    [59 * 1000 + 999,       "01:00"],  // 59.999秒 → ceil → 60秒 → 1:00
  ])("formatTime(%i) => %s", (ms, expected) => {
    expect(formatTime(ms)).toBe(expected);
  });
});

// ----------------------------------------------------------------
// buildViewModel
// ----------------------------------------------------------------
describe("buildViewModel", () => {
  const WORK_DURATION = 25 * 60 * 1000;

  test("idle状態でtimerTextが正しい", () => {
    const vm = buildViewModel("idle", WORK_DURATION, WORK_DURATION);
    expect(vm.timerText).toBe("25:00");
  });

  test("idle状態でmodeLabelが '作業中'", () => {
    const vm = buildViewModel("idle", WORK_DURATION, WORK_DURATION);
    expect(vm.modeLabel).toBe("作業中");
  });

  test("work状態でmodeLabelが '作業中'", () => {
    const vm = buildViewModel("work", WORK_DURATION / 2, WORK_DURATION);
    expect(vm.modeLabel).toBe("作業中");
  });

  test("short_break状態でmodeLabelが '短休憩'", () => {
    const vm = buildViewModel("short_break", 5 * 60 * 1000, 5 * 60 * 1000);
    expect(vm.modeLabel).toBe("短休憩");
  });

  test("long_break状態でmodeLabelが '長休憩'", () => {
    const vm = buildViewModel("long_break", 15 * 60 * 1000, 15 * 60 * 1000);
    expect(vm.modeLabel).toBe("長休憩");
  });

  test("progressRatioが残り時間/総時間になる", () => {
    const vm = buildViewModel("work", WORK_DURATION / 2, WORK_DURATION);
    expect(vm.progressRatio).toBeCloseTo(0.5);
  });

  test("progressRatioが1.0を超えない", () => {
    const vm = buildViewModel("work", WORK_DURATION + 1000, WORK_DURATION);
    expect(vm.progressRatio).toBe(1);
  });

  test("progressRatioが0.0を下回らない", () => {
    const vm = buildViewModel("work", -1, WORK_DURATION);
    expect(vm.progressRatio).toBe(0);
  });

  test("idle状態でstartBtnActiveがtrue", () => {
    const vm = buildViewModel("idle", WORK_DURATION, WORK_DURATION);
    expect(vm.startBtnActive).toBe(true);
  });

  test("work状態でstartBtnActiveがfalse", () => {
    const vm = buildViewModel("work", WORK_DURATION / 2, WORK_DURATION);
    expect(vm.startBtnActive).toBe(false);
  });

  test("short_break状態でstartBtnActiveがtrue", () => {
    const vm = buildViewModel("short_break", 5 * 60 * 1000, 5 * 60 * 1000);
    expect(vm.startBtnActive).toBe(true);
  });

  test("idle状態でresetBtnActiveがfalse", () => {
    const vm = buildViewModel("idle", WORK_DURATION, WORK_DURATION);
    expect(vm.resetBtnActive).toBe(false);
  });

  test("work状態でresetBtnActiveがtrue", () => {
    const vm = buildViewModel("work", WORK_DURATION / 2, WORK_DURATION);
    expect(vm.resetBtnActive).toBe(true);
  });
});

// ----------------------------------------------------------------
// render — JSDOMを使ったDOM反映テスト
// ----------------------------------------------------------------
describe("render", () => {
  /** モック要素を生成するヘルパー */
  function makeElements() {
    return {
      timerText:    document.createElement("span"),
      ringProgress: document.createElement("circle"),
      modeLabel:    document.createElement("p"),
      startBtn:     document.createElement("button"),
      resetBtn:     document.createElement("button"),
    };
  }

  test("timerTextのtextContentが更新される", () => {
    const els = makeElements();
    const vm = buildViewModel("idle", 25 * 60 * 1000, 25 * 60 * 1000);
    render(vm, els);
    expect(els.timerText.textContent).toBe("25:00");
  });

  test("modeLabelのtextContentが更新される", () => {
    const els = makeElements();
    const vm = buildViewModel("short_break", 5 * 60 * 1000, 5 * 60 * 1000);
    render(vm, els);
    expect(els.modeLabel.textContent).toBe("短休憩");
  });

  test("startBtnのtextContentが更新される", () => {
    const els = makeElements();
    const vm = buildViewModel("idle", 25 * 60 * 1000, 25 * 60 * 1000);
    render(vm, els);
    expect(els.startBtn.textContent).toBe("開始");
  });

  test("startBtnActive=falseのときdisabledがtrueになる", () => {
    const els = makeElements();
    const vm = buildViewModel("work", 25 * 60 * 1000, 25 * 60 * 1000);
    render(vm, els);
    expect(els.startBtn.disabled).toBe(true);
  });

  test("startBtnActive=trueのときdisabledがfalseになる", () => {
    const els = makeElements();
    const vm = buildViewModel("idle", 25 * 60 * 1000, 25 * 60 * 1000);
    render(vm, els);
    expect(els.startBtn.disabled).toBe(false);
  });

  test("resetBtnActive=falseのときdisabledがtrueになる", () => {
    const els = makeElements();
    const vm = buildViewModel("idle", 25 * 60 * 1000, 25 * 60 * 1000);
    render(vm, els);
    expect(els.resetBtn.disabled).toBe(true);
  });

  test("ringProgressのstrokeDashoffsetがprogressRatioから計算される（満タン）", () => {
    const els = makeElements();
    render({ timerText: "25:00", progressRatio: 1, modeLabel: "作業中",
             startBtnLabel: "開始", startBtnActive: true, resetBtnActive: false }, els);
    expect(parseFloat(els.ringProgress.style.strokeDashoffset)).toBeCloseTo(0, 1);
  });

  test("ringProgressのstrokeDashoffsetがprogressRatioから計算される（空）", () => {
    const els = makeElements();
    render({ timerText: "00:00", progressRatio: 0, modeLabel: "作業中",
             startBtnLabel: "開始", startBtnActive: true, resetBtnActive: false }, els);
    expect(parseFloat(els.ringProgress.style.strokeDashoffset))
      .toBeCloseTo(RING_CIRCUMFERENCE, 1);
  });

  test("progressRatio=0.5のときoffsetがRING_CIRCUMFERENCE/2になる", () => {
    const els = makeElements();
    render({ timerText: "12:30", progressRatio: 0.5, modeLabel: "作業中",
             startBtnLabel: "開始", startBtnActive: false, resetBtnActive: true }, els);
    expect(parseFloat(els.ringProgress.style.strokeDashoffset))
      .toBeCloseTo(RING_CIRCUMFERENCE / 2, 1);
  });

  test("elements未指定でもIDから要素を取得して描画できる", () => {
    document.body.innerHTML = `
      <span id="timerText"></span>
      <circle id="ringProgress"></circle>
      <p id="modeLabel"></p>
      <button id="startBtn"></button>
      <button id="resetBtn"></button>
    `;

    render({
      timerText: "24:59",
      progressRatio: 0.9,
      modeLabel: "作業中",
      startBtnLabel: "開始",
      startBtnActive: true,
      resetBtnActive: false,
    });

    expect(document.getElementById("timerText").textContent).toBe("24:59");
    expect(document.getElementById("modeLabel").textContent).toBe("作業中");
    expect(document.getElementById("startBtn").disabled).toBe(false);
    expect(document.getElementById("resetBtn").disabled).toBe(true);
  });
});
