const assert = require('node:assert/strict');
const sinon = require('sinon');
const jobsServiceV2 = require('../../../../../../core/server/services/jobs/v2').default;
const {registerJobHandlers} = require('../../../../../../core/server/services/jobs/v2/register-handlers');
const InMemoryJobsBackend = require('../../../../../../core/server/adapters/jobs/InMemoryJobsBackend').default;

describe('Job handler registration (v2)', function () {
    beforeEach(function () {
        // A fresh init resets the registration set, exactly like a boot
        jobsServiceV2.init({backend: new InMemoryJobsBackend(), errorReporter: sinon.stub()});
        registerJobHandlers();
    });

    afterEach(async function () {
        await jobsServiceV2.shutdown({timeoutMs: 100});
        sinon.restore();
    });

    it('registers every job type in one place', function () {
        assert.deepEqual(jobsServiceV2.registeredTypes, [
            'media-inliner'
        ]);
    });

    it('registers each job type exactly once — re-registration would silently replace a handler', function () {
        const types = jobsServiceV2.registeredTypes;
        assert.equal(new Set(types).size, types.length);
    });

    it('is re-runnable across boots', function () {
        jobsServiceV2.init({backend: new InMemoryJobsBackend(), errorReporter: sinon.stub()});
        registerJobHandlers();

        assert.deepEqual(jobsServiceV2.registeredTypes, [
            'media-inliner'
        ]);
    });
});
