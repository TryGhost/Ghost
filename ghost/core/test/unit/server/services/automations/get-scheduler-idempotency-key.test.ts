import assert from 'node:assert/strict';

import {getSchedulerIdempotencyKey} from '../../../../../core/server/services/automations/get-scheduler-idempotency-key';

describe('getSchedulerIdempotencyKey', function () {
    it('returns same result for same date and URL', function () {
        const date = new Date();
        const url = new URL('https://example.com/path?key=value');

        const first = getSchedulerIdempotencyKey(date, url);
        const second = getSchedulerIdempotencyKey(date, url);

        assert.equal(first, second);
    });

    it('returns different results for different times', function () {
        const url = new URL('https://example.com/path?key=value');

        const first = getSchedulerIdempotencyKey(new Date(100), url);
        const second = getSchedulerIdempotencyKey(new Date(200), url);

        assert.notEqual(first, second);
    });

    it('returns different results for different URLs', function () {
        const date = new Date();
        const firstUrl = new URL('https://example.com/path?key=one');
        const secondUrl = new URL('https://example.com/path?key=two');

        const first = getSchedulerIdempotencyKey(date, firstUrl);
        const second = getSchedulerIdempotencyKey(date, secondUrl);

        assert.notEqual(first, second);
    });

    it('prefixes with an automations namespace', function () {
        const date = new Date();
        const url = new URL('https://example.com/path?key=value');

        const key = getSchedulerIdempotencyKey(date, url);

        assert(key.startsWith('ghost-automations-'));
    });
});
