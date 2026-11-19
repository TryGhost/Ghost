import assert from 'node:assert/strict';
import sinon from 'sinon';
import {
  addDays,
  daysBetween,
  localDateOf,
  resolveTimeZone,
  startOfLocalDay,
  toUnixTime,
} from '@tryghost/kernel/clock';

describe('Clock', function () {
  afterEach(function () {
    sinon.restore();
  });

  it('turns epoch milliseconds into whole seconds', function () {
    assert.equal(toUnixTime(1700000000999), 1700000000);
    assert.equal(toUnixTime(1700000001000), 1700000001);
  });

  describe('local dates', function () {
    const utc = (ms: number) => new Date(ms).toISOString();

    it('starts a day at local midnight, including half-hour offsets', function () {
      assert.equal(
        utc(startOfLocalDay('2026-11-01', 'America/New_York')),
        '2026-11-01T04:00:00.000Z',
      );
      assert.equal(
        utc(startOfLocalDay('2026-11-02', 'America/New_York')),
        '2026-11-02T05:00:00.000Z',
      );
      assert.equal(utc(startOfLocalDay('2026-11-01', 'Asia/Kolkata')), '2026-10-31T18:30:00.000Z');
    });

    it('starts a day at the DST transition when midnight is skipped', function () {
      assert.equal(
        utc(startOfLocalDay('2026-09-06', 'America/Santiago')),
        '2026-09-06T04:00:00.000Z',
      );
      assert.equal(
        utc(startOfLocalDay('2026-09-07', 'America/Santiago')),
        '2026-09-07T03:00:00.000Z',
      );
    });

    it('starts a day at the first midnight when DST repeats midnight', function () {
      assert.equal(utc(startOfLocalDay('2021-10-29', 'Asia/Amman')), '2021-10-28T21:00:00.000Z');
    });

    it('finds the local date of an instant', function () {
      assert.equal(localDateOf(Date.parse('2026-11-03T23:59:59Z'), 'Asia/Tokyo'), '2026-11-04');
      assert.equal(
        localDateOf(Date.parse('2026-11-04T03:00:00Z'), 'America/New_York'),
        '2026-11-03',
      );
    });

    it('does calendar arithmetic across month and leap-year ends', function () {
      assert.equal(addDays('2028-02-28', 1), '2028-02-29');
      assert.equal(addDays('2026-01-01', -1), '2025-12-31');
      assert.equal(daysBetween('2026-01-01', '2026-12-31'), 364);
      assert.equal(daysBetween('2026-11-03', '2026-11-01'), -2);
    });

    it('resolves timezone names and rejects unknown ones', function () {
      assert.equal(resolveTimeZone('utc'), 'UTC');
      assert.equal(resolveTimeZone('Mars/Olympus'), null);
    });
  });
});
