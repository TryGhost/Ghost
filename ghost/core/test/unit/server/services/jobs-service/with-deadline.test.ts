import assert from 'node:assert/strict';
import sinon from 'sinon';
import {describe, it, afterEach} from 'vitest';
import withDeadline, {isDeadlineExceeded} from '../../../../../core/server/services/jobs-service/with-deadline';

describe('withDeadline', function () {
    afterEach(function () {
        sinon.restore();
    });

    it('resolves with the value when the work finishes in time', async function () {
        const result = await withDeadline(Promise.resolve('done'), 1000, 'a-job');

        assert.equal(result, 'done');
    });

    it('rejects with the original error when the work fails in time', async function () {
        const err = new Error('the work itself failed');

        await assert.rejects(
            withDeadline(Promise.reject(err), 1000, 'a-job'),
            /the work itself failed/
        );
    });

    it('rejects with a deadline error when the work outlives the deadline', async function () {
        // Never settles - the shape of a job wedged on a hung socket
        const wedged = new Promise(() => {});

        await assert.rejects(
            withDeadline(wedged, 10, 'a-job'),
            /Job "a-job" exceeded its 10ms deadline/
        );
    });

    it('marks a deadline breach so callers can tell it from a real failure', async function () {
        const wedged = new Promise(() => {});

        const err = await withDeadline(wedged, 10, 'a-job').catch(e => e);

        assert.ok(isDeadlineExceeded(err), 'a deadline breach is identifiable');
        // Abandoning slow work is not a crash, so it must not look like the
        // work's own errors, which do belong in Sentry.
        assert.equal(isDeadlineExceeded(new Error('the work itself failed')), false);
    });

    it('refuses a timeout that is not a positive number', async function () {
        // setTimeout(fn, undefined) and setTimeout(fn, NaN) both fire at ~0ms,
        // so a missing config value would silently abandon every run instantly.
        for (const bad of [undefined, null, NaN, 0, -1, '15000']) {
            await assert.rejects(
                withDeadline(Promise.resolve('done'), bad as number, 'a-job'),
                /Job "a-job" was given an invalid deadline/,
                `expected ${JSON.stringify(bad)} to be rejected`
            );
        }
    });

    it('clears its timer once the work settles, so it holds nothing open', async function () {
        const clock = sinon.useFakeTimers();
        try {
            await withDeadline(Promise.resolve('done'), 60000, 'a-job');

            assert.equal(clock.countTimers(), 0, 'the deadline timer must not outlive the work');
        } finally {
            clock.restore();
        }
    });
});
