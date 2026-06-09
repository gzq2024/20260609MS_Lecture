const { STATES } = require("./state_machine.js");

function isCountdownState(state) {
  return (
    state === STATES.WORK ||
    state === STATES.SHORT_BREAK ||
    state === STATES.LONG_BREAK
  );
}

function shouldAutoResumeCountdown(state, endAt, now) {
  return (
    isCountdownState(state) &&
    typeof endAt === "number" &&
    Number.isFinite(endAt) &&
    endAt > now
  );
}

function shouldCompleteExpiredCountdown(state, endAt, now) {
  return (
    isCountdownState(state) &&
    typeof endAt === "number" &&
    Number.isFinite(endAt) &&
    endAt <= now
  );
}

module.exports = {
  shouldAutoResumeCountdown,
  shouldCompleteExpiredCountdown,
};
