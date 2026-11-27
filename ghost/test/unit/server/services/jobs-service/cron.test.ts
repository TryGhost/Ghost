import assert from 'node:assert/strict';
import { describe, it } from 'vitest';
import { randomFiveMinuteCron } from '../../../../../core/server/services/jobs-service/cron';

describe('randomFiveMinuteCron', function () {
  it('runs every five minutes at the random second and minute offset', function () {
    const values = [0.1, 0.7];

    assert.equal(
      randomFiveMinuteCron(() => values.shift()!),
      '6 3/5 * * * *',
    );
  });

  it('keeps the seconds and minute offset within one five-minute window', function () {
    assert.equal(
      randomFiveMinuteCron(() => 0),
      '0 0/5 * * * *',
    );
    assert.equal(
      randomFiveMinuteCron(() => 0.9999),
      '59 4/5 * * * *',
    );
  });
});
