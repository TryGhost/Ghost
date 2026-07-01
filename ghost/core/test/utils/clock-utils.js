const sinon = require('sinon');

/**
 * Pin the system clock to `now` for deterministic time-based assertions while
 * leaving real timers (setTimeout/setInterval) intact, so async I/O — DB queries,
 * HTTP requests, awaited jobs — keeps resolving. Faking only `Date`, rather than
 * sinon's default of the whole timer surface, is what stops these tests hanging
 * under Vitest, where faked timers freeze mysql2's pool timers and the awaited
 * request flows.
 *
 * Returns the sinon clock — `clock.tick()`/`clock.tickAsync()` advance time;
 * `clock.restore()` (or `sinon.restore()`) undoes it.
 *
 * @param {Date|number} [now] initial time (defaults to the real current time)
 * @returns {import('sinon').SinonFakeTimers}
 */
function mockSystemTime(now = Date.now()) {
    return sinon.useFakeTimers({now, toFake: ['Date']});
}

module.exports = {mockSystemTime};
