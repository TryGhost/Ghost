import assert from 'node:assert/strict';

import { getSchedulerIdempotencyKey } from '../../../../../core/server/adapters/scheduling/get-scheduler-idempotency-key';

describe('getSchedulerIdempotencyKey', function () {
  const namespace = 'automations';

  it('returns same result for same date and URL', function () {
    const date = new Date();
    const url = new URL('https://example.com/path?key=value');

    const first = getSchedulerIdempotencyKey({ namespace, date, url });
    const second = getSchedulerIdempotencyKey({ namespace, date, url });

    assert.equal(first, second);
  });

  it('returns different results for different times', function () {
    const url = new URL('https://example.com/path?key=value');

    const first = getSchedulerIdempotencyKey({ namespace, date: new Date(100), url });
    const second = getSchedulerIdempotencyKey({ namespace, date: new Date(200), url });

    assert.notEqual(first, second);
  });

  it('returns different results for different URLs', function () {
    const date = new Date();
    const firstUrl = new URL('https://example.com/path?key=one');
    const secondUrl = new URL('https://example.com/path?key=two');

    const first = getSchedulerIdempotencyKey({ namespace, date, url: firstUrl });
    const second = getSchedulerIdempotencyKey({ namespace, date, url: secondUrl });

    assert.notEqual(first, second);
  });

  it('returns different results for different namespaces', function () {
    const date = new Date();
    const url = new URL('https://example.com/path?key=value');

    const first = getSchedulerIdempotencyKey({ namespace: 'automations', date, url });
    const second = getSchedulerIdempotencyKey({ namespace: 'post-scheduling', date, url });

    assert.notEqual(first, second);
  });

  it('prefixes with the ghost namespace', function () {
    const date = new Date();
    const url = new URL('https://example.com/path?key=value');

    const key = getSchedulerIdempotencyKey({ namespace, date, url });

    assert(key.startsWith('ghost-automations-'));
  });

  it('stays within the scheduler key limits regardless of URL length', function () {
    const date = new Date();
    const url = new URL(`https://example.com/path?token=${'x'.repeat(2000)}`);

    const key = getSchedulerIdempotencyKey({ namespace, date, url });

    assert(key.length <= 255);
    assert.match(key, /^[\x20-\x7e]+$/);
  });
});
