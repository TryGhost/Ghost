import assert from 'node:assert/strict';
import sinon from 'sinon';
import logging from '@tryghost/logging';
import {describe, it, beforeEach, afterEach} from 'vitest';

// require, not import: boot.js reaches these through require() at call time, so
// the stubs have to land on the same CommonJS module objects.
const boot = require('../../core/boot');
const themeService = require('../../core/server/services/themes');
const emailService = require('../../core/server/services/email-service');
const activitypub = require('../../core/server/services/activitypub');
const memberJobs = require('../../core/server/services/members/jobs');
const updateCheck = require('../../core/server/services/update-check');
const milestonesService = require('../../core/server/services/milestones');

// Background services are fire-and-forget side effects, so each one is stubbed
// out and the test observes only which of them boot decided to start. Gifts and
// remote-flags need no stub: both return early when uninitialised or unconfigured,
// which is what they are here.
describe('boot: background services', function () {
    let scheduleJobsStub: sinon.SinonStub;
    let originalEmailService: unknown;
    const config = {get: () => false};

    beforeEach(function () {
        sinon.stub(themeService, 'loadInactiveThemes');
        // Assigned by the wrapper's init(), which boot has already run by this
        // point in production but which no unit test wants to drive.
        originalEmailService = emailService.service;
        emailService.service = {resumeInterruptedSends: sinon.stub().resolves()};
        sinon.stub(activitypub, 'init').resolves();
        sinon.stub(memberJobs, 'scheduleTokenCleanupJob').resolves();
        sinon.stub(milestonesService, 'initAndRun');
        sinon.stub(logging, 'error');

        scheduleJobsStub = sinon.stub(updateCheck, 'scheduleJobs').resolves();
    });

    afterEach(function () {
        emailService.service = originalEmailService;
        sinon.restore();
    });

    async function initBackgroundServicesOutsideTestEnv() {
        const originalEnv = process.env.NODE_ENV;
        process.env.NODE_ENV = 'production';
        try {
            await boot.initBackgroundServices({config});
        } finally {
            process.env.NODE_ENV = originalEnv;
        }
    }

    it('starts the update check jobs', async function () {
        await initBackgroundServicesOutsideTestEnv();

        assert.ok(scheduleJobsStub.calledOnce, 'boot is what starts the update check');
    });

    it('does not start background services under the test environment', async function () {
        await boot.initBackgroundServices({config});

        assert.ok(scheduleJobsStub.notCalled, 'tests must not get a live update check schedule');
    });

    it('logs rather than throws when the update check fails to schedule', async function () {
        const err = new Error('the jobs service was not ready');
        scheduleJobsStub.rejects(err);

        await initBackgroundServicesOutsideTestEnv();

        // Background services are not awaited by boot, so an escaping rejection
        // would surface as an unhandled one rather than a logged failure.
        assert.ok((logging.error as sinon.SinonStub).calledWith(err), 'the failure is logged');
        assert.ok(milestonesService.initAndRun.calledOnce, 'later services still start');
    });
});
