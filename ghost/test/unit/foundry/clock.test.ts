import assert from 'node:assert/strict';
import sinon from 'sinon';
import { createClock } from '@tryghost/foundry/clock';

describe('Foundry clock', function () {
  afterEach(function () {
    sinon.restore();
  });

  it('reads the system time on each call, in epoch milliseconds', function () {
    const timers = sinon.useFakeTimers({ now: 1700000000999, toFake: ['Date'] });
    const clock = createClock();

    assert.equal(clock.now(), 1700000000999);
    timers.tick(1);
    assert.equal(clock.now(), 1700000001000);
  });
});
