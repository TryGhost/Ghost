import assert from 'node:assert/strict';

// Required (not imported) so the class identity matches the one the adapter
// manager loads through its own require chain.
const InMemoryJobQueue = require('../../../../../core/server/adapters/jobqueue/InMemoryJobQueue').default;

describe('services/jobs/queue', function () {
    it('loads the InMemoryJobQueue backend through the adapter manager by default', async function () {
        const jobQueue = require('../../../../../core/server/services/jobs/queue').default;

        assert.ok(jobQueue instanceof InMemoryJobQueue);

        // The full JobQueue surface is present on the wired instance.
        for (const fn of ['handle', 'dispatch', 'scheduleRecurring', 'allSettled', 'shutdown', 'onError']) {
            assert.equal(typeof (jobQueue as never)[fn], 'function', `missing ${fn}`);
        }
    });

    it('returns the same instance on repeated require (singleton)', function () {
        const first = require('../../../../../core/server/services/jobs/queue').default;
        const second = require('../../../../../core/server/services/jobs/queue').default;
        assert.equal(first, second);
    });
});
