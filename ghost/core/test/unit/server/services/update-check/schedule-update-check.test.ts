import assert from 'node:assert/strict';
import sinon from 'sinon';
import {describe, it, beforeEach, afterEach} from 'vitest';

// require, not import: these must resolve to the same CommonJS module
// instances that core/server/services/update-check/index.js loads, so the
// init() here is the instance scheduleJobs() reads.
const jobsService = require('../../../../../core/server/services/jobs-service');
const adapterManager = require('../../../../../core/server/services/adapter-manager').default;
const legacyJobManager = require('../../../../../core/server/services/jobs');
const registerJobHandlers = require('../../../../../core/server/services/jobs-service/register-job-handlers').default;
const UpdateCheckJob = require('../../../../../core/server/services/update-check/update-check-job').default;
const configUtils = require('../../../../utils/config-utils');

const UPDATE_CHECK_PATH = require.resolve('../../../../../core/server/services/update-check');

// The module tracks "already scheduled" in module state that has no reset, so
// each test takes a fresh copy rather than inheriting the previous test's flag.
function loadUpdateCheck() {
    delete require.cache[UPDATE_CHECK_PATH];
    return require(UPDATE_CHECK_PATH);
}

// Must await fn(): a synchronous finally around an async callback restores
// NODE_ENV at the callback's first await, so everything after that await would
// run back under the test environment.
async function runOutsideTestEnv<T>(fn: () => Promise<T>): Promise<T> {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    try {
        return await fn();
    } finally {
        process.env.NODE_ENV = originalEnv;
    }
}

describe('update check: scheduling', function () {
    let scheduleStub: sinon.SinonStub;
    let enqueueStub: sinon.SinonStub;
    let legacyAddJobStub: sinon.SinonStub;
    let updateCheck: ReturnType<typeof loadUpdateCheck>;

    beforeEach(function () {
        jobsService.init();
        const backend = adapterManager.getAdapter('jobs');
        scheduleStub = sinon.stub(backend, 'scheduleRecurring');
        enqueueStub = sinon.stub(backend, 'enqueue');
        // The migration's core guarantee is that the job lives in exactly one
        // system. Nothing may reach the legacy Bree manager any more.
        legacyAddJobStub = sinon.stub(legacyJobManager, 'addJob');
        updateCheck = loadUpdateCheck();
    });

    afterEach(async function () {
        await jobsService.shutdown({timeoutMs: 100});
        sinon.restore();
        await configUtils.restore();
    });

    it('does not schedule the update check under the test environment', async function () {
        await updateCheck.scheduleJobs();

        assert.ok(scheduleStub.notCalled, 'the update check must not be scheduled under NODE_ENV=test*');
    });

    it('schedules the update check exactly once outside the test environment', async function () {
        await runOutsideTestEnv(async () => {
            await updateCheck.scheduleJobs();
            await updateCheck.scheduleJobs();
        });

        assert.ok(scheduleStub.calledOnce, 'a repeat call must not add a second schedule');
        const [envelope] = scheduleStub.firstCall.args;
        assert.equal(envelope.type, 'update-check');
        assert.equal(envelope.payload, '{}');
    });

    // Two pinned draws, because one cannot tell a range apart from an offset:
    // members/jobs' maxHour of 6 fails the first, and a 6-23 window fails the
    // second. Guards the exact regression of copying randomDailyCron() over
    // without its full-day spread.
    it('spreads the daily cron up to the last hour of the day', async function () {
        sinon.stub(Math, 'random').returns(0.99);

        await runOutsideTestEnv(() => updateCheck.scheduleJobs());

        assert.equal(scheduleStub.firstCall.args[1].cron, '59 59 23 * * *');
    });

    it('spreads the daily cron down to the first hour of the day', async function () {
        sinon.stub(Math, 'random').returns(0);

        await runOutsideTestEnv(() => updateCheck.scheduleJobs());

        assert.equal(scheduleStub.firstCall.args[1].cron, '0 0 0 * * *');
    });

    it('does not dispatch a boot run unless an update check is forced', async function () {
        configUtils.set('updateCheck:forceUpdate', false);

        await runOutsideTestEnv(() => updateCheck.scheduleJobs());

        assert.ok(enqueueStub.notCalled, 'an unforced boot must only schedule the daily job');
    });

    it('dispatches a boot run when an update check is forced', async function () {
        configUtils.set('updateCheck:forceUpdate', true);

        await runOutsideTestEnv(() => updateCheck.scheduleJobs());

        assert.ok(enqueueStub.calledOnce, 'a forced boot enqueues a single job');
        assert.equal(enqueueStub.firstCall.args[0].type, 'update-check');
    });

    it('never registers the job with the legacy job manager', async function () {
        configUtils.set('updateCheck:forceUpdate', true);

        await runOutsideTestEnv(() => updateCheck.scheduleJobs());

        assert.ok(scheduleStub.calledOnce, 'the recurring job really was scheduled on the new service');
        assert.ok(enqueueStub.calledOnce, 'the boot job really was dispatched on the new service');
        assert.ok(legacyAddJobStub.notCalled, 'no entry point may register a legacy Bree job');
    });

    it('registers a handler for the update-check job type', function () {
        registerJobHandlers();

        assert.throws(
            () => jobsService.getInstance().handle(UpdateCheckJob, async () => {}),
            /A handler for job type "update-check" is already registered\./
        );
    });
});
