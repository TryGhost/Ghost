import assert from 'node:assert/strict';
import { FixedWindowLimiter } from '../../../../../core/server/services/editor-presence/rate-limiter';

describe('FixedWindowLimiter', function () {
  it('allows up to the limit per window and then refuses', function () {
    let now = 0;
    const limiter = new FixedWindowLimiter({ limit: 2, windowMs: 1_000, now: () => now });

    assert.equal(limiter.take('u1').allowed, true);
    assert.equal(limiter.take('u1').allowed, true);
    assert.deepEqual(limiter.take('u1'), { allowed: false, retryAfterMs: 1_000 });

    now = 400;
    assert.deepEqual(limiter.take('u1'), { allowed: false, retryAfterMs: 600 });
    assert.equal(limiter.take('u2').allowed, true);

    now = 1_000;
    assert.equal(limiter.take('u1').allowed, true);
  });
});
