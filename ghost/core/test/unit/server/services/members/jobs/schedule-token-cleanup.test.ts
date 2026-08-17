import assert from 'node:assert/strict';
import sinon from 'sinon';
import {describe, it, beforeEach, afterEach} from 'vitest';

// require, not import: these must resolve to the same CommonJS module
// instances that core/server/services/members/jobs/index.js loads, so the
// init() here is the instance scheduleTokenCleanupJob() reads.
const jobsService = require('../../../../../../core/server/services/jobs-service');
const adapterManager = require('../../../../../../core/server/services/adapter-manager').default;
const memberJobs = require('../../../../../../core/server/services/members/jobs');

describe('member jobs: token cleanup scheduling', function () {
    let scheduleStub: sinon.SinonStub;

    beforeEach(function () {
        jobsService.init();
        const backend = adapterManager.getAdapter('jobs');
        scheduleStub = sinon.stub(backend, 'scheduleRecurring');
    });

    afterEach(async function () {
        await jobsService.shutdown({timeoutMs: 100});
        sinon.restore();
    });

    it('does not schedule token cleanup under the test environment', async function () {
        await memberJobs.scheduleTokenCleanupJob();

        assert.ok(scheduleStub.notCalled, 'token cleanup must not be scheduled under NODE_ENV=test*');
    });

    it('schedules a daily clean-tokens job outside the test environment', async function () {
        const originalEnv = process.env.NODE_ENV;
        process.env.NODE_ENV = 'production';
        try {
            await memberJobs.scheduleTokenCleanupJob();
        } finally {
            process.env.NODE_ENV = originalEnv;
        }

        assert.ok(scheduleStub.calledOnce, 'clean-tokens is scheduled outside the test environment');
        const [envelope, schedule] = scheduleStub.firstCall.args;
        assert.equal(envelope.type, 'clean-tokens');
        assert.match(schedule.cron, /^\d+ \d+ \d+ \* \* \*$/, 'a random daily 6-field cron');
    });
});
