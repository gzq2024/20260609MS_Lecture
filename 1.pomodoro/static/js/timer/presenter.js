/**
 * presenter.js — UIレンダリング集約
 *
 * render(viewModel) だけを公開し、DOM直操作を1か所に封じ込める。
 * ロジック層はこの関数を呼ぶだけでよく、DOMを知る必要がない。
 *
 * viewModel の型:
 * {
 *   timerText      : string   // "25:00"
 *   progressRatio  : number   // 0.0（空）〜 1.0（満タン）
 *   modeLabel      : string   // "作業中" | "短休憩" | "長休憩"
 *   startBtnLabel  : string   // "開始" | "再開"（将来拡張用）
 *   startBtnActive : boolean  // 開始ボタンが有効か
 *   resetBtnActive : boolean  // リセットボタンが有効か
 * }
 */

// SVGリングの円周 (2 * π * r = 2 * π * 80 ≈ 502.65)
const RING_CIRCUMFERENCE = 2 * Math.PI * 80;

/**
 * 残り時間 (ms) を "MM:SS" 形式の文字列に変換する。
 * @param {number} remainingMs
 * @returns {string}
 */
function formatTime(remainingMs) {
  const totalSeconds = Math.ceil(remainingMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

/**
 * viewModel をDOMに反映する。
 * 渡した要素オブジェクトに対して操作するため、テスト時はモックDOMを渡せる。
 *
 * @param {Object} viewModel
 * @param {Object} elements  DOMエレメントの参照マップ
 * @param {Element} elements.timerText
 * @param {Element} elements.ringProgress
 * @param {Element} elements.modeLabel
 * @param {Element} elements.startBtn
 * @param {Element} elements.resetBtn
 */
/**
 * 描画対象のDOM要素セットを解決する。
 * elements が渡された場合はそれを優先し、未指定時はIDでDOMから取得する。
 *
 * @param {Object|undefined} elements
 * @returns {Object}
 */
function resolveElements(elements) {
  if (elements) return elements;
  const getRequiredElement = (id) => {
    const element = document.getElementById(id);
    if (!element) {
      throw new Error(`Required element #${id} not found`);
    }
    return element;
  };

  return {
    timerText: getRequiredElement("timerText"),
    ringProgress: getRequiredElement("ringProgress"),
    modeLabel: getRequiredElement("modeLabel"),
    startBtn: getRequiredElement("startBtn"),
    resetBtn: getRequiredElement("resetBtn"),
  };
}

function render(viewModel, elements) {
  const { timerText, ringProgress, modeLabel, startBtn, resetBtn } = resolveElements(elements);

  // 残り時間テキスト
  timerText.textContent = viewModel.timerText;

  // SVGプログレスリング（progressRatio: 1.0=満タン、0.0=空）
  const offset = RING_CIRCUMFERENCE * (1 - viewModel.progressRatio);
  ringProgress.style.strokeDashoffset = offset;

  // モードラベル
  modeLabel.textContent = viewModel.modeLabel;

  // ボタン状態
  startBtn.textContent = viewModel.startBtnLabel;
  startBtn.disabled = !viewModel.startBtnActive;

  resetBtn.disabled = !viewModel.resetBtnActive;
}

/**
 * アプリ状態とコンテキストから viewModel を生成する。
 *
 * @param {string} state          現在の状態 (STATES のいずれか)
 * @param {number} remainingMs    残り時間 (ms)
 * @param {number} totalDurationMs 現在モードの総時間 (ms)
 * @returns {Object} viewModel
 */
function buildViewModel(state, remainingMs, totalDurationMs) {
  const MODE_LABELS = {
    idle: "作業中",
    work: "作業中",
    short_break: "短休憩",
    long_break: "長休憩",
    paused: "一時停止中",
  };

  const progressRatio = totalDurationMs > 0
    ? Math.max(0, Math.min(1, remainingMs / totalDurationMs))
    : 1;

  const isIdle = state === "idle";
  const isBreak = state === "short_break" || state === "long_break";

  return {
    timerText: formatTime(remainingMs),
    progressRatio,
    modeLabel: MODE_LABELS[state] ?? "作業中",
    startBtnLabel: isBreak ? "休憩開始" : "開始",
    startBtnActive: isIdle || isBreak,
    resetBtnActive: state !== "idle",
  };
}

module.exports = { render, buildViewModel, formatTime, RING_CIRCUMFERENCE };
