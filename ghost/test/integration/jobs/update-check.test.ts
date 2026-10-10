import assert from 'node:assert/strict';
import http from 'node:http';
import sinon from 'sinon';
import type { AddressInfo } from 'node:net';
import UpdateCheckJob from '../../../core/server/services/update-check/jobs/update-check-job';

const logging = require('@tryghost/logging');
const models = require('../../../core/server/models');
const { agentProvider, configUtils } = require('../../utils/e2e-framework');
const { getInstance: getJobsService } = require('../../../core/server/services/jobs-service');

async function waitFor(
  check: () => Promise<boolean> | boolean,
  { timeoutMs = 5000, intervalMs = 25 } = {},
): Promise<boolean> {
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

function jobCompleted(infoSpy: sinon.SinonSpy, jobType: string): boolean {
  return infoSpy.getCalls().some((call) => {
    return (
      call.args[0]?.system?.event === 'job.completed' && call.args[0]?.system?.job_type === jobType
    );
  });
}

describe('Job: Update check', function () {
  let mockUpdateServer: http.Server | null = null;

  beforeAll(async function () {
    await agentProvider.getAdminAPIAgent();
  });

  afterEach(async function () {
    sinon.restore();
    if (mockUpdateServer) {
      mockUpdateServer.close();
      mockUpdateServer = null;
    }
    await configUtils.restore();
    await models.Settings.edit(
      { key: 'notifications', value: '[]' },
      { context: { internal: true } },
    );
  });

  it('runs the update check when a boot dispatch occurs', async function () {
    let requestCount = 0;
    mockUpdateServer = http.createServer((req, res) => {
      requestCount += 1;
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ hello: 'world' }));
    });
    mockUpdateServer.listen(0);
    const { port } = mockUpdateServer.address() as AddressInfo;

    configUtils.set('updateCheck:forceUpdate', true);
    configUtils.set('updateCheck:url', `http://127.0.0.1:${port}`);

    const loggingInfoSpy = sinon.spy(logging, 'info');

    await getJobsService().dispatch(new UpdateCheckJob());

    const completed = await waitFor(() => jobCompleted(loggingInfoSpy, 'update-check'));
    assert.ok(completed, 'the boot dispatch completes under the shared update-check type');
    assert.equal(requestCount, 1, 'the dispatched job reached the update endpoint once');
  });

  it('stores an alert-type custom notification end-to-end', async function () {
    // Default fixtures leave the Owner inactive, so the alert branch's email
    // send returns early without touching the mailer. Activate the Owner so
    // the job exercises the full notificationEmailService path.
    const owner = await models.User.findOne(
      { email: 'ghost@example.com' },
      { context: { internal: true }, withRelated: ['roles'] },
    );
    await owner.save({ status: 'active' }, { patch: true, context: { internal: true } });

    const nextCheckTimestamp = Math.floor(Date.now() / 1000) + 86400;
    mockUpdateServer = http.createServer((req, res) => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          id: 99999,
          version: 'all-test',
          messages: [
            {
              id: 'integration-test-alert-msg',
              version: '^6',
              content: '<p>Integration test alert</p>',
              top: true,
              dismissible: false,
              type: 'alert',
            },
          ],
          created_at: '2026-06-08T00:00:00.000Z',
          custom: true,
          next_check: nextCheckTimestamp,
        }),
      );
    });
    mockUpdateServer.listen(0);
    const { port } = mockUpdateServer.address() as AddressInfo;

    configUtils.set('updateCheck:forceUpdate', true);
    configUtils.set('updateCheck:url', `http://127.0.0.1:${port}`);
    // The job runs in-process now, so the mailer honours runtime config:
    // route it to the stub transport instead of a real SMTP connection.
    configUtils.set('mail:transport', 'stub');

    const loggingInfoSpy = sinon.spy(logging, 'info');

    await getJobsService().dispatch(new UpdateCheckJob());

    const completed = await waitFor(() => jobCompleted(loggingInfoSpy, 'update-check'));
    assert.ok(completed, 'the dispatched job completes under the update-check type');

    const setting = await models.Settings.findOne(
      { key: 'notifications' },
      { context: { internal: true } },
    );
    const stored = JSON.parse(setting.get('value'));
    const ourNotification = stored.find(
      (n: { id: string }) => n.id === 'integration-test-alert-msg',
    );

    assert.ok(ourNotification, 'Expected the alert notification to be stored in settings');
    assert.equal(ourNotification.type, 'alert');
    assert.equal(ourNotification.message, '<p>Integration test alert</p>');
    assert.equal(ourNotification.custom, true);

    const nextCheckSetting = await models.Settings.findOne(
      { key: 'next_update_check' },
      { context: { internal: true } },
    );
    assert.equal(
      Number(nextCheckSetting.get('value')),
      nextCheckTimestamp,
      'a successful check advances next_update_check to the endpoint-provided time',
    );
  });
});
