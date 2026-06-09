/**
 * scheduler.js — タイマー実行抽象レイヤー
 *
 * setInterval を直接使わず Scheduler 経由にすることで、
 * テスト時に非同期待ちなしで tick を手動制御できる。
 *
 * - IntervalScheduler : 本番用。setInterval / clearInterval を使う。
 * - ManualScheduler   : テスト用。tick() で手動で進める。
 */

/** 本番用スケジューラ */
class IntervalScheduler {
  constructor() {
    this._id = null;
  }

  /**
   * コールバックを一定間隔で呼び出す。
   * @param {Function} callback
   * @param {number} interval ミリ秒
   */
  start(callback, interval) {
    this.stop();
    this._id = setInterval(callback, interval);
  }

  /** インターバルを停止する。 */
  stop() {
    if (this._id !== null) {
      clearInterval(this._id);
      this._id = null;
    }
  }

  /** 実行中かどうかを返す。 */
  isRunning() {
    return this._id !== null;
  }
}

/**
 * テスト用スケジューラ
 *
 * start() で登録したコールバックを tick() で任意回数呼び出す。
 *
 * @example
 * const scheduler = new ManualScheduler();
 * scheduler.start(callback, 1000);
 * scheduler.tick(); // callback が1回呼ばれる
 */
class ManualScheduler {
  constructor() {
    this._callback = null;
    this._running = false;
    this.callCount = 0;
  }

  /**
   * @param {Function} callback
   */
  start(callback) {
    this.stop();
    this._callback = callback;
    this._running = true;
    this.callCount = 0;
  }

  stop() {
    this._callback = null;
    this._running = false;
  }

  /** コールバックを1回手動実行する。 */
  tick() {
    if (this._running && this._callback) {
      this._callback();
      this.callCount++;
    }
  }

  isRunning() {
    return this._running;
  }
}

module.exports = { IntervalScheduler, ManualScheduler };
