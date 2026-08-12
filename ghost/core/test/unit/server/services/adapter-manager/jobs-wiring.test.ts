import assert from 'node:assert/strict';
import defaults from '../../../../../core/shared/config/defaults.json';

// JobsBackendBase is required rather than imported so that we compare against
// the same class the adapter loader resolves — it loads adapters with
// `require`, and an ESM import here could resolve to a different copy of the
// package, failing the `instanceof` check. The adapter-manager is required via
// its `.default` export so its methods stay stubbable (see the sibling
// route-settings wiring test for the long-form rationale).
const {JobsBackendBase} = require('@tryghost/adapter-base-jobs');
const adapterManager = require('../../../../../core/server/services/adapter-manager').default;

describe('UNIT: adapter-manager jobs wiring', function () {
    afterEach(function () {
        adapterManager.clearCache();
    });

    it('selects InMemoryJobsBackend as the active jobs adapter in the default config', function () {
        assert.equal(defaults.adapters.jobs.active, 'InMemoryJobsBackend');
    });

    it('returns an InMemoryJobsBackend instance extending JobsBackendBase by default', function () {
        const adapter = adapterManager.getAdapter('jobs');

        assert.ok(adapter instanceof JobsBackendBase);
        assert.equal(adapter.constructor.name, 'InMemoryJobsBackend');
        assert.deepEqual([...adapter.requiredFns], ['start', 'enqueue', 'scheduleRecurring', 'shutdown']);
    });

    it('caches the jobs adapter instance across getAdapter calls', function () {
        const first = adapterManager.getAdapter('jobs');
        const second = adapterManager.getAdapter('jobs');

        assert.equal(first, second);
    });
});
