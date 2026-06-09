/**
 * clock.js — 時刻抽象レイヤー
 *
 * Date.now() を直接使わず Clock 経由にすることで、
 * テスト時に任意の時刻を注入できる。
 *
 * - SystemClock : 本番用。実際の Date.now() を返す。
 * - FakeClock   : テスト用。手動で時刻を設定・進める。
 */

/** 本番用クロック */
class SystemClock {
  /** 現在時刻をミリ秒で返す。 */
  now() {
    return Date.now();
  }
}

/**
 * テスト用クロック
 *
 * @example
 * const clock = new FakeClock(1000);
 * clock.now();    // => 1000
 * clock.tick(500);
 * clock.now();    // => 1500
 */
class FakeClock {
  /**
   * @param {number} [initialTime=0] 初期時刻 (ms)
   */
  constructor(initialTime = 0) {
    this._time = initialTime;
  }

  /** 現在の仮想時刻をミリ秒で返す。 */
  now() {
    return this._time;
  }

  /**
   * 時刻を指定ミリ秒だけ進める。
   * @param {number} ms
   */
  tick(ms) {
    this._time += ms;
  }

  /**
   * 時刻を任意の値に設定する。
   * @param {number} time
   */
  setTime(time) {
    this._time = time;
  }
}

module.exports = { SystemClock, FakeClock };
