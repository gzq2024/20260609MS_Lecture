/**
 * app.js — タイマーアプリ エントリポイント
 *
 * Clock / Scheduler / StateMachine / Presenter を接続し、
 * ボタンイベントとカウントダウンループを駆動する。
 */

import {
  DEFAULT_CONFIG,
  DEFAULT_SOUND_SETTINGS,
  createConfig,
} from "./timer/config.js";
import { SystemClock } from "./timer/clock.js";
import { IntervalScheduler } from "./timer/scheduler.js";
import {
  STATES,
  EVENTS,
  createInitialContext,
  nextState,
  calcRemaining,
} from "./timer/state_machine.js";
import { render, buildViewModel } from "./timer/presenter.js";

// ----------------------------------------------------------------
// DOM参照
// ----------------------------------------------------------------
const elements = {
  timerText:    document.getElementById("timerText"),
  ringProgress: document.getElementById("ringProgress"),
  modeLabel:    document.getElementById("modeLabel"),
  startBtn:     document.getElementById("startBtn"),
  resetBtn:     document.getElementById("resetBtn"),
  completedCount: document.getElementById("completedCount"),
  focusTime:     document.getElementById("focusTime"),
  workDurationSelect: document.getElementById("workDurationSelect"),
  breakDurationSelect: document.getElementById("breakDurationSelect"),
  themeSelect: document.getElementById("themeSelect"),
  soundStartToggle: document.getElementById("soundStartToggle"),
  soundEndToggle: document.getElementById("soundEndToggle"),
  soundTickToggle: document.getElementById("soundTickToggle"),
};

// ----------------------------------------------------------------
// 初期化
// ----------------------------------------------------------------
const clock     = new SystemClock();
const scheduler = new IntervalScheduler();
let config      = DEFAULT_CONFIG;

let state   = STATES.IDLE;
let context = createInitialContext(config);

// 完了イベント重複防止フラグ
let _completed = false;
let _lastTickSecond = null;
let _currentWorkDuration = config.workDuration;

let settings = {
  workMinutes: 25,
  breakMinutes: 5,
  theme: "light",
  sound: { ...DEFAULT_SOUND_SETTINGS },
};

// デバッグ設定
const DEBUG = true;

function debugLog(message, data = null) {
  if (DEBUG) {
    console.log(`[Pomodoro] ${message}`, data || "");
  }

  function playBeep(freq = 880, durationSec = 0.08, volume = 0.03) {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const audio = new AudioCtx();
      const osc = audio.createOscillator();
      const gain = audio.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.value = volume;
      osc.connect(gain);
      gain.connect(audio.destination);
      osc.start();
      osc.stop(audio.currentTime + durationSec);
      osc.onended = () => audio.close();
    } catch (err) {
      debugLog("Failed to play sound", err);
    }
  }

  function applyTheme(theme) {
    document.body.setAttribute("data-theme", theme);
  }

  function saveSettingsToStorage() {
    try {
      localStorage.setItem("pomodoroSettings", JSON.stringify(settings));
    } catch (err) {
      console.error("Failed to save settings:", err);
    }
  }

  function loadSettingsFromStorage() {
    try {
      const raw = localStorage.getItem("pomodoroSettings");
      if (!raw) return;
      const parsed = JSON.parse(raw);
      settings = {
        ...settings,
        ...parsed,
        sound: {
          ...settings.sound,
          ...(parsed.sound || {}),
        },
      };
    } catch (err) {
      console.error("Failed to load settings:", err);
    }
  }

  function applySettingsToState() {
    config = createConfig(settings.workMinutes, settings.breakMinutes);
    context = { ...context, config };
    applyTheme(settings.theme);
  }

  function syncSettingsUI() {
    if (elements.workDurationSelect) {
      elements.workDurationSelect.value = String(settings.workMinutes);
    }
    if (elements.breakDurationSelect) {
      elements.breakDurationSelect.value = String(settings.breakMinutes);
    }
    if (elements.themeSelect) {
      elements.themeSelect.value = settings.theme;
    }
    if (elements.soundStartToggle) {
      elements.soundStartToggle.checked = Boolean(settings.sound.start);
    }
    if (elements.soundEndToggle) {
      elements.soundEndToggle.checked = Boolean(settings.sound.end);
    }
    if (elements.soundTickToggle) {
      elements.soundTickToggle.checked = Boolean(settings.sound.tick);
    }
  }
}

// ================================================================
// localStorage永続化
// ================================================================

/**
 * 現在の状態をlocalStorageに保存する
 */
function saveStateToStorage() {
  const appState = {
    state,
    context: {
      completedSessions: context.completedSessions,
      endAt: context.endAt,
    },
    timestamp: Date.now(),
  };
  try {
    localStorage.setItem("pomodoroAppState", JSON.stringify(appState));
    debugLog("State saved to localStorage", appState);
  } catch (err) {
    console.error("Failed to save state to localStorage:", err);
  }
}

/**
 * localStorageから状態を復元する
 */
function loadStateFromStorage() {
  try {
    const stored = localStorage.getItem("pomodoroAppState");
    if (!stored) {
      debugLog("No saved state in localStorage");
      return null;
    }

    const appState = JSON.parse(stored);
    debugLog("State loaded from localStorage", appState);

    // 1時間以上経過している場合はリセット
    const elapsed = Date.now() - appState.timestamp;
    if (elapsed > 3600000) {
      debugLog("Saved state is older than 1 hour, resetting");
      clearStateFromStorage();
      return null;
    }

    return appState;
  } catch (err) {
    console.error("Failed to load state from localStorage:", err);
    return null;
  }
}

/**
 * localStorageから状態を削除する
 */
function clearStateFromStorage() {
  try {
    localStorage.removeItem("pomodoroAppState");
    debugLog("State cleared from localStorage");
  } catch (err) {
    console.error("Failed to clear state from localStorage:", err);
  }
}


// ================================================================
// API関数
// ================================================================

/**
 * セッションをサーバーに保存する
 * @param {string} sessionType - "work", "short_break", "long_break"
 * @param {number} startedAt - セッション開始時刻（ms）
 * @param {number} endedAt - セッション終了時刻（ms）
 */
async function saveSession(sessionType, startedAt, endedAt) {
  const focusMinutes = sessionType === "work"
    ? Math.ceil((endedAt - startedAt) / 60000)
    : 0;

  const payload = {
    session_type: sessionType,
    started_at: startedAt,
    ended_at: endedAt,
    focus_minutes: focusMinutes,
  };

  try {
    debugLog(`Saving ${sessionType} session`, payload);
    const response = await fetch("/api/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    
    if (!response.ok) {
      console.error(`Failed to save session: ${response.status}`);
      return;
    }
    
    const result = await response.json();
    debugLog("Session saved successfully", result);
  } catch (err) {
    console.error("Error saving session:", err);
  }
}

/**
 * 今日の統計情報をサーバーから取得してUIを更新
 */
async function loadStats() {
  try {
    debugLog("Loading stats from /api/stats/today");
    const response = await fetch("/api/stats/today");
    
    if (!response.ok) {
      console.error(`Failed to load stats: ${response.status}`);
      return;
    }
    
    const data = await response.json();
    debugLog("Stats loaded", data);
    
    if (elements.completedCount) {
      elements.completedCount.textContent = data.completed || 0;
    }
    if (elements.focusTime) {
      elements.focusTime.textContent = data.focus_minutes || 0;
    }
  } catch (err) {
    console.error("Error loading stats:", err);
  }
}


// ----------------------------------------------------------------
// 描画ヘルパー
// ----------------------------------------------------------------
function currentDuration() {
  if (state === STATES.SHORT_BREAK) return config.shortBreakDuration;
  if (state === STATES.LONG_BREAK)  return config.longBreakDuration;
  return config.workDuration;
}

function redraw() {
  const remaining = calcRemaining(context.endAt, clock.now(), config);
  const vm = buildViewModel(state, remaining, currentDuration());
  render(vm);
}

// ----------------------------------------------------------------
// カウントダウンループ（毎200ms tick）
// ----------------------------------------------------------------
function onTick() {
  const now       = clock.now();
  const remaining = calcRemaining(context.endAt, now, config);
  const tickSecond = Math.ceil(remaining / 1000);

  if (
    settings.sound.tick &&
    remaining > 0 &&
    tickSecond !== _lastTickSecond
  ) {
    playBeep(660, 0.03, 0.02);
  }
  _lastTickSecond = tickSecond;

  redraw();

  // 0秒到達 → 完了イベントを一度だけ発火
  if (remaining === 0 && !_completed) {
    _completed = true;
    scheduler.stop();

    // WORK セッション完了時にAPI保存
    const wasWork = state === STATES.WORK;
    const sessionStartedAt = context.endAt - _currentWorkDuration;

    ({ state, context } = nextState(state, EVENTS.COMPLETE, context, now));
    debugLog("Session completed", { wasWork, state });
    _completed = false;
    _lastTickSecond = null;

    // 状態をlocalStorageに保存
    saveStateToStorage();

    // WORK セッション完了直後に保存
    if (wasWork) {
      if (settings.sound.end) {
        playBeep(520, 0.12, 0.04);
      }
      saveSession("work", sessionStartedAt, now);
      loadStats();
    }

    // 休憩/作業への自動遷移後に再描画
    redraw();

    // 休憩状態なら自動的にカウントダウン開始
    if (state === STATES.SHORT_BREAK || state === STATES.LONG_BREAK) {
      _startCountdown();
    }
  }
}

function _startCountdown() {
  _lastTickSecond = null;
  scheduler.start(onTick, 200);
}

// ----------------------------------------------------------------
// ボタンイベント
// ----------------------------------------------------------------
elements.startBtn.addEventListener("click", () => {
  if (state !== STATES.IDLE && state !== STATES.SHORT_BREAK && state !== STATES.LONG_BREAK) return;

  const now = clock.now();
  _currentWorkDuration = config.workDuration;
  ({ state, context } = nextState(state, EVENTS.START, context, now));
  debugLog("START button clicked", { state });
  _completed = false;
  _lastTickSecond = null;
  if (settings.sound.start) {
    playBeep(960, 0.08, 0.04);
  }
  saveStateToStorage();
  _startCountdown();
  redraw();
});

elements.resetBtn.addEventListener("click", () => {
  scheduler.stop();
  _completed = false;
  _lastTickSecond = null;
  ({ state, context } = nextState(state, EVENTS.RESET, context, clock.now()));
  debugLog("RESET button clicked");
  clearStateFromStorage();
  redraw();
});

if (elements.workDurationSelect) {
  elements.workDurationSelect.addEventListener("change", (event) => {
    settings.workMinutes = Number(event.target.value) || 25;
    applySettingsToState();
    saveSettingsToStorage();
    if (state === STATES.IDLE) redraw();
  });
}

if (elements.breakDurationSelect) {
  elements.breakDurationSelect.addEventListener("change", (event) => {
    settings.breakMinutes = Number(event.target.value) || 5;
    applySettingsToState();
    saveSettingsToStorage();
    if (state === STATES.IDLE) redraw();
  });
}

if (elements.themeSelect) {
  elements.themeSelect.addEventListener("change", (event) => {
    settings.theme = event.target.value || "light";
    applyTheme(settings.theme);
    saveSettingsToStorage();
  });
}

if (elements.soundStartToggle) {
  elements.soundStartToggle.addEventListener("change", (event) => {
    settings.sound.start = event.target.checked;
    saveSettingsToStorage();
  });
}

if (elements.soundEndToggle) {
  elements.soundEndToggle.addEventListener("change", (event) => {
    settings.sound.end = event.target.checked;
    saveSettingsToStorage();
  });
}

if (elements.soundTickToggle) {
  elements.soundTickToggle.addEventListener("change", (event) => {
    settings.sound.tick = event.target.checked;
    saveSettingsToStorage();
  });
}

// ----------------------------------------------------------------
// 初期化と復元
// ----------------------------------------------------------------

// localStorageから設定を復元する
loadSettingsFromStorage();
applySettingsToState();
syncSettingsUI();

// localStorageから状態を復元する
const savedAppState = loadStateFromStorage();
if (savedAppState) {
  state = savedAppState.state;
  context = {
    ...context,
    completedSessions: savedAppState.context.completedSessions,
    endAt: savedAppState.context.endAt,
  };
  debugLog("State restored from localStorage", { state });
}

redraw();
loadStats();
