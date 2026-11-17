import assert from 'node:assert/strict';
import { describe, it } from 'vitest';
import {
  localDateBounds,
  localDateOf,
  startOfLocalDay,
} from '../../../../../../core/server/services/stats/utils/local-dates';

const utc = (ms: number) => new Date(ms).toISOString();

describe('local dates', function () {
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

  it('bounds inclusive local dates as a half-open UTC range', function () {
    assert.deepEqual(localDateBounds('2026-11-01', '2026-11-02', 'Asia/Kolkata'), {
      from: '2026-10-31 18:30:00',
      to: '2026-11-02 18:30:00',
    });
    assert.deepEqual(localDateBounds(null, '2026-11-02', 'UTC'), {
      from: null,
      to: '2026-11-03 00:00:00',
    });
  });

  it('finds the local date of an instant', function () {
    assert.equal(localDateOf(Date.parse('2026-11-03T23:59:59Z'), 'Asia/Tokyo'), '2026-11-04');
    assert.equal(localDateOf(Date.parse('2026-11-04T03:00:00Z'), 'America/New_York'), '2026-11-03');
  });
});
