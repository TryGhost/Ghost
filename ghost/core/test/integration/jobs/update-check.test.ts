import assert from 'node:assert/strict';
import http from 'node:http';
import type {AddressInfo} from 'node:net';
import sinon from 'sinon';
import logging from '@tryghost/logging';
import {describe, it, beforeAll, afterEach} from 'vitest';

// require, not import: the jobs service is a CommonJS singleton and this must
// be the same module instance boot called init()/start() on.
const {agentProvider, fixtureManager, mockManager, configUtils} = require('../../utils/e2e-framework');
const models = require('../../../core/server/models');
const sentry = require('../../../core/shared/sentry');
const mailService = require('../../../core/server/services/mail');
const {getInstance: getJobsService} = require('../../../core/server/services/jobs-service');
const UpdateCheckJob = require('../../../core/server/services/update-check/update-check-job').default;

async function waitFor(check: () => unknown | Promise<unknown>, {timeoutMs = 5000, intervalMs = 25} = {}) {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
        if (await check()) {
            return true;
        }
        await new Promise((resolve) => {
            setTimeout(resolve, intervalMs);
        });
    }
    return false;
}

// Returns the `system` payload of the first structured log carrying `event`.
function findSystemLog(spy: sinon.SinonSpy, event: string) {
    const call = spy.getCalls().find(c => c.args[0]?.system?.event === event);
    return call ? call.args[0].system : undefined;
}

async function readNextUpdateCheck() {
    const setting = await models.Settings.findOne({key: 'next_update_check'}, {context: {internal: true}});
    return setting ? setting.get('value') : null;
}

// A single custom alert message - the branch that emails every active admin.
function alertResponse() {
    return {
        id: 99999,
        version: 'all-test',
        messages: [{
            id: 'integration-test-alert-msg',
            version: '^6',
            content: '<p>Integration test alert</p>',
            top: true,
            dismissible: false,
            type: 'alert'
        }],
        created_at: '2026-06-08T00:00:00.000Z',
        custom: true,
        next_check: Math.floor(Date.now() / 1000) + 86400
    };
}

describe('Job: Update check', function () {
    let mockUpdateServer: http.Server | undefined;

    function startMockUpdateServer(body: unknown) {
        const requests: {count: number} = {count: 0};

        mockUpdateServer = http.createServer((req, res) => {
            requests.count += 1;
            res.writeHead(200, {'Content-Type': 'application/json'});
            res.end(JSON.stringify(body));
        });
        mockUpdateServer.listen(0);

        const {port} = mockUpdateServer.address() as AddressInfo;
        // The job reads both of these from config at run time, so this is all
        // it takes to point the in-process check at our mock server.
        configUtils.set('updateCheck:url', `http://127.0.0.1:${port}`);
        configUtils.set('updateCheck:forceUpdate', true);

        return requests;
    }

    beforeAll(async function () {
        await agentProvider.getAdminAPIAgent();
        await fixtureManager.init();
    });

    afterEach(async function () {
        if (mockUpdateServer) {
            mockUpdateServer.close();
            mockUpdateServer = undefined;
        }
        // Reset the settings each test writes, so none of them depends on
        // running before or after any other. next_update_check matters as much
        // as notifications: it is the gate that decides whether a check runs.
        await models.Settings.edit({key: 'notifications', value: '[]'}, {context: {internal: true}});
        await models.Settings.edit({key: 'next_update_check', value: '1'}, {context: {internal: true}});
        mockManager.restore();
        sinon.restore();
        await configUtils.restore();
    });

    it('runs the update check in process and logs a structured completion event', async function () {
        const requests = startMockUpdateServer({hello: 'world'});
        const loggingInfoSpy = sinon.spy(logging, 'info');

        await getJobsService().dispatch(new UpdateCheckJob());

        const completed = await waitFor(() => findSystemLog(loggingInfoSpy, 'update_check.completed'));
        assert.ok(completed, 'The dispatched job runs and logs update_check.completed');

        assert.equal(requests.count, 1, 'Expected the mock update server to receive 1 request');

        const system = findSystemLog(loggingInfoSpy, 'update_check.completed');
        assert.equal(system.checked, true);
        assert.equal(typeof system.notifications_received, 'number');
        assert.equal(typeof system.duration_ms, 'number');
    });

    it('stores an alert-type custom notification end-to-end', async function () {
        // The alert branch only exercises the mailer pipeline when
        // users.browse finds an active admin, so make sure the Owner is one.
        const owner = await fixtureManager.getCurrentOwnerUser();
        await owner.save({status: 'active'}, {patch: true, context: {internal: true}});

        // The check now runs in the main process, so the mailer can be stubbed
        // directly instead of routing a worker's env at nodemailer level.
        mockManager.mockMail();
        sinon.spy(logging, 'info');

        startMockUpdateServer(alertResponse());

        await getJobsService().dispatch(new UpdateCheckJob());

        const stored = await waitFor(async () => {
            const setting = await models.Settings.findOne({key: 'notifications'}, {context: {internal: true}});
            return JSON.parse(setting.get('value')).find((n: {id: string}) => n.id === 'integration-test-alert-msg');
        });
        assert.ok(stored, 'Expected the alert notification to be stored in settings');

        // notifications.add runs after the email block, so without this a
        // regression that stops alerting admins still stores the notification
        // and leaves the rest of this test green.
        mockManager.assert.sentEmailCount(1);
        mockManager.assert.sentEmail({
            subject: /^Action required: Critical alert from Ghost instance/,
            to: owner.get('email')
        });

        const setting = await models.Settings.findOne({key: 'notifications'}, {context: {internal: true}});
        const ourNotification = JSON.parse(setting.get('value'))
            .find((n: {id: string}) => n.id === 'integration-test-alert-msg');

        // Pins the handler's mapping of the task's summary: the mock response
        // above carries exactly one notification. Asserting only the type here
        // lets a hardcoded 0 through, which is the whole point of the summary.
        const system = findSystemLog(logging.info as sinon.SinonSpy, 'update_check.completed');
        assert.equal(system.notifications_received, 1);

        assert.equal(ourNotification.type, 'alert');
        assert.equal(ourNotification.message, '<p>Integration test alert</p>');
        assert.equal(ourNotification.custom, true);
    });

    it('surfaces a failed check to Sentry and still advances the daily gate', async function () {
        // rethrowErrors: true is the whole reason failures are visible at all -
        // drop it from the handler and this test goes red.
        const captureException = sinon.stub(sentry, 'captureException');

        mockUpdateServer = http.createServer((req, res) => {
            res.writeHead(500, {'Content-Type': 'application/json'});
            res.end(JSON.stringify({error: 'update service is down'}));
        });
        mockUpdateServer.listen(0);
        const {port} = mockUpdateServer.address() as AddressInfo;
        configUtils.set('updateCheck:url', `http://127.0.0.1:${port}`);
        configUtils.set('updateCheck:forceUpdate', true);

        await getJobsService().dispatch(new UpdateCheckJob());

        const captured = await waitFor(() => captureException.called);
        assert.ok(captured, 'A failing check is reported to Sentry');
        assert.equal(captureException.firstCall.args[1].tags.job_type, 'update-check');

        // updateCheckError bumps the gate before rethrowing, so a broken update
        // service cannot wedge the check into retrying forever. The edit is not
        // awaited inside the error handler, hence waiting on it here.
        const advanced = await waitFor(async () => {
            return Number(await readNextUpdateCheck()) > Math.floor(Date.now() / 1000);
        });
        assert.ok(advanced, 'next_update_check was still moved into the future');
    });

    it('abandons a check that outlives its deadline instead of hanging', async function () {
        // A mailer that never settles is what an unreachable SMTP host looks
        // like on the direct transport: the old worker was cancellable, this
        // one has to bound itself or it holds shutdown open.
        sinon.stub(mailService.GhostMailer.prototype, 'sendMail').returns(new Promise(() => {}));
        configUtils.set('updateCheck:timeout', 200);

        const owner = await fixtureManager.getCurrentOwnerUser();
        await owner.save({status: 'active'}, {patch: true, context: {internal: true}});

        const loggingWarnSpy = sinon.spy(logging, 'warn');
        const captureException = sinon.stub(sentry, 'captureException');
        startMockUpdateServer(alertResponse());

        await getJobsService().dispatch(new UpdateCheckJob());

        const abandoned = await waitFor(() => findSystemLog(loggingWarnSpy, 'update_check.abandoned'));
        assert.ok(abandoned, 'The wedged run is abandoned at its deadline rather than running forever');

        const system = findSystemLog(loggingWarnSpy, 'update_check.abandoned');
        assert.equal(system.deadline_ms, 200);
        assert.equal(typeof system.duration_ms, 'number');

        // Slow is not broken. Routing this through Sentry would page someone
        // over a mail host that is merely unreachable.
        assert.ok(captureException.notCalled, 'abandoning slow work is not reported as a crash');
    });
});
