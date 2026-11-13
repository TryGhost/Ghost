import assert from 'node:assert/strict';
import sinon from 'sinon';
import { vi } from 'vitest';

const logging = require('@tryghost/logging');
const DomainEvents = require('@tryghost/domain-events');
const {
  agentProvider,
  fixtureManager,
  mockManager,
  configUtils,
} = require('../utils/e2e-framework');
const {
  accepted,
  assertSendInvariant,
  createPublishedPostEmail,
  mockRecordingMailgun,
  retryEmail,
  waitForEmailStatus,
} = require('../utils/batch-email-utils');
const urlServiceUtils = require('../utils/url-service-utils');
const { bootGhost } = require('../../core/boot');
const models = require('../../core/server/models');
const adapterManager = require('../../core/server/services/adapter-manager').default;
const settingsService = require('../../core/server/services/settings/settings-service');
const jobsService = require('../../core/server/services/jobs-service');
const emailService = require('../../core/server/services/email-service');

const mailgun500 = {
  status: 500,
  message: 'Internal server error',
  details: 'Something went wrong',
};

function delay(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function waitUntil(condition: () => unknown, timeout = 8000) {
  return vi.waitUntil(condition, { timeout, interval: 50 });
}

async function batchStatuses(emailId: string) {
  const batches = await models.EmailBatch.findAll({ filter: `email_id:'${emailId}'` });
  return batches.models.map((batch: any) => batch.get('status')).sort();
}

// Isolated: these tests stop and reboot Ghost
describe('Newsletter sends under failure', function () {
  let agent: any;
  let ghostServer: any;
  let mailgun: any;
  // Lets a test's held Mailgun calls finish, so Ghost can stop
  let releaseHeldCalls: (() => void) | undefined;

  // Boot skips the resume scan in tests, so run it here
  async function reboot() {
    await DomainEvents.allSettled();
    adapterManager.clearCache();
    urlServiceUtils.resetRouters();
    settingsService.reset();
    ghostServer = await bootGhost({ backend: true, frontend: false, server: true });
    await emailService.service.resumeInterruptedSends();
  }

  beforeEach(async function () {
    ({ adminAgent: agent, ghostServer } = await agentProvider.getAgentsWithFrontend());
    await fixtureManager.init('newsletters', 'members:newsletters');
    await agent.loginAsOwner();

    // Four fixture members, one batch each
    configUtils.set('bulkEmail:batchSize', 1);
    mockManager.mockMail();
    mockManager.mockStripe();
    mailgun = mockRecordingMailgun();
    releaseHeldCalls = undefined;
  });

  afterEach(async function () {
    releaseHeldCalls?.();
    await ghostServer.stop();
    mockManager.restore();
    sinon.restore();
  });

  it('finishes in-flight batches on a graceful shutdown and sends the rest after a reboot', async function () {
    mailgun.respond = async () => {
      await delay(1000);
      return accepted;
    };

    const email = await createPublishedPostEmail(agent);
    await waitUntil(() => mailgun.calls.length === 2);
    await ghostServer.stop();

    await email.refresh();
    assert.equal(email.get('status'), 'submitting');
    assert.deepEqual(await batchStatuses(email.id), [
      'pending',
      'pending',
      'submitted',
      'submitted',
    ]);

    await reboot();
    await waitForEmailStatus(email.id);

    await email.refresh();
    assert.equal(email.get('status'), 'submitted');
    assert.deepEqual(await batchStatuses(email.id), [
      'submitted',
      'submitted',
      'submitted',
      'submitted',
    ]);
    assert.equal(mailgun.calls.length, 4);
    await assertSendInvariant(email.id, mailgun);
  });

  it('does not re-send orphaned batches after a crash', async function () {
    const held = Promise.withResolvers<void>();
    releaseHeldCalls = () => held.resolve();
    mailgun.respond = async (call: any) => {
      if (mailgun.calls.indexOf(call) < 2) {
        await held.promise;
      }
      return accepted;
    };
    sinon.stub(logging, 'error');

    const email = await createPublishedPostEmail(agent);
    await waitUntil(() => mailgun.calls.length === 2);

    // A simulated crash: the first send is abandoned mid-flight, still holding
    // two batches in Mailgun, and the jobs service starts again
    await jobsService.shutdown({ timeoutMs: 1 });
    await jobsService.getInstance().start();
    await emailService.service.resumeInterruptedSends();
    await waitForEmailStatus(email.id);

    await email.refresh();
    assert.equal(email.get('status'), 'failed');
    assert.equal(
      email.get('error'),
      'We couldn’t confirm whether your newsletter finished sending.',
    );
    assert.deepEqual(await batchStatuses(email.id), [
      'submitted',
      'submitted',
      'submitting',
      'submitting',
    ]);
    assert.equal(mailgun.calls.length, 4);
    await assertSendInvariant(email.id, mailgun);
  });

  it('re-sends only the failed batch when a failed send is retried', async function () {
    mailgun.respond = async () => {
      if (mailgun.calls.length === 3) {
        throw mailgun500;
      }
      return accepted;
    };
    sinon.stub(logging, 'error');

    const email = await createPublishedPostEmail(agent);
    await waitForEmailStatus(email.id);

    await email.refresh();
    assert.equal(email.get('status'), 'failed');
    assert.deepEqual(await batchStatuses(email.id), [
      'failed',
      'submitted',
      'submitted',
      'submitted',
    ]);
    await assertSendInvariant(email.id, mailgun);

    mailgun.respond = async () => accepted;
    await retryEmail(agent, email.id);
    await waitForEmailStatus(email.id);

    await email.refresh();
    assert.equal(email.get('status'), 'submitted');
    assert.equal(mailgun.calls.length, 5);
    assert.equal(mailgun.calls.filter((call: any) => call.outcome === 'rejected').length, 1);
    await assertSendInvariant(email.id, mailgun);
  });
});
