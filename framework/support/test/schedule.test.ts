import assert from 'node:assert/strict';
import { afterEach, describe, it, vi } from 'vitest';
import { dailyOffPeak } from '../src/index.ts';

describe('dailyOffPeak', function () {
  afterEach(function () {
    vi.restoreAllMocks();
  });

  it('gives a six-field cron expression for once a day', function () {
    assert.match(dailyOffPeak(), /^\d{1,2} \d{1,2} \d{1,2} \* \* \*$/);
  });

  it('picks the earliest time, midnight, when chance gives its lowest', function () {
    vi.spyOn(Math, 'random').mockReturnValue(0);

    assert.equal(dailyOffPeak(), '0 0 0 * * *');
  });

  it('picks the latest time, just before 6am, when chance gives its highest', function () {
    vi.spyOn(Math, 'random').mockReturnValue(0.999999);

    assert.equal(dailyOffPeak(), '59 59 5 * * *');
  });
});
