import assert from 'node:assert/strict';
import sinon from 'sinon';
import { getUnixTime, moment as legacyMoment } from '../../../core/kernel/clock';

describe('Clock', function () {
  afterEach(function () {
    sinon.restore();
  });

  it('reads the current time in whole seconds on each call', function () {
    const clock = sinon.useFakeTimers({ now: 1700000000999, toFake: ['Date'] });

    assert.equal(getUnixTime(), 1700000000);
    clock.tick(1);
    assert.equal(getUnixTime(), 1700000001);
  });

  it('shares the legacy Moment instance configured by Ghost', function () {
    assert.equal(legacyMoment, require('moment-timezone'));
    assert.equal(legacyMoment('2026-10-13T12:00:00').format('Z'), '+00:00');
  });

  it('preserves timezone-aware calendar arithmetic across daylight saving changes', function () {
    const before = legacyMoment.tz('2026-03-28T12:00:00', 'Europe/London');
    const after = before.clone().add(1, 'day');

    assert.equal(after.format(), '2026-03-29T12:00:00+01:00');
    assert.equal(after.diff(before, 'hours'), 23);
  });
});
