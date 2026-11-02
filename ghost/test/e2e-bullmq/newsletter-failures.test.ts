import assert from 'node:assert/strict';
import sinon from 'sinon';
import { Queue } from 'bullmq';
import type { Job } from 'bullmq';
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
const { getBullMQConnection, getBullMQPrefix } = require('../utils/jobs-backend-utils');
const urlServiceUtils = require('../utils/url-service-utils');
const boot = require('../../core/boot');
const models = require('../../core/server/models');
const db = require('../../core/server/data/db');
const adapterManager = require('../../core/server/services/adapter-manager').default;
const settingsService = require('../../core/server/services/settings/settings-service');
const jobsService = require('../../core/server/services/jobs-service');
const emailService = require('../../core/server/services/email-service');
const BatchSendingService = require('../../core/server/services/email-service/batch-sending-service');

const outboxEnabled = configUtils.config.get('services:jobs:outbox:enabled');

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

async function withEmailQueue<T>(fn: (queue: Queue) => Promise<T>) {
  const queue = new Queue('email', {
    connection: getBullMQConnection(),
    prefix: getBullMQPrefix(),
  });
  try {
    return await fn(queue);
  } finally {
    await queue.close();
  }
}

async function describeJob(job: Job) {
  return {
    id: job.id,
    state: await job.getState(),
    processedOn: job.processedOn,
    finishedOn: job.finishedOn,
  };
}

async function findSendJobs(emailId: string) {
  return withEmailQueue(async (queue) => {
    const jobs = await queue.getJobs(['active', 'waiting', 'delayed', 'completed', 'failed']);
    return Promise.all(jobs.filter((job) => job.data.payload.includes(emailId)).map(describeJob));
  });
}

async function getJob(id: string | undefined) {
  return withEmailQueue(async (queue) => describeJob((await queue.getJob(id!))!));
}

async function pauseRedis(ms: number) {
  const queue = new Queue('pause', { connection: getBullMQConnection() });
  const client: any = await queue.client;
  const endsAt = Date.now() + ms;
  await client.client('PAUSE', ms, 'ALL');
  // close() resolves only once Redis answers, that is, after the pause
  return { endsAt, over: queue.close() };
}

async function listJobsClients(client: any) {
  const list = String(await client.client('LIST'));
  return list
    .split('\n')
    .map((line) => ({ id: line.match(/^id=(\d+)/)?.[1], name: line.match(/ name=(\S*)/)?.[1] }))
    .filter(({ name }) => name?.startsWith(getBullMQPrefix()));
}

async function withRedisClient<T>(fn: (client: any) => Promise<T>) {
  const queue = new Queue('inspect', { connection: getBullMQConnection() });
  try {
    return await fn(await queue.client);
  } finally {
    await queue.close();
  }
}

async function killJobsConnections() {
  return withRedisClient(async (client) => {
    const clients = await listJobsClients(client);
    for (const { id } of clients) {
      await client.client('KILL', 'ID', id);
    }
    return clients;
  });
}

describe('Newsletter sends on BullMQ under failure', function () {
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
    ghostServer = await boot({ backend: true, frontend: false, server: true });
    await emailService.service.resumeInterruptedSends();
  }

  beforeAll(function () {
    // Set before the first boot, which is when the jobs backend reads it
    configUtils.set('adapters:jobs:BullMQJobsBackend:connection:connectionName', getBullMQPrefix());
  });

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
    const [job] = await findSendJobs(email.id);
    assert.equal(job.state, 'completed');

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
    const [crashed] = await findSendJobs(email.id);

    // A simulated crash: force-close the workers mid-send
    await jobsService.shutdown({ timeoutMs: 1 });
    assert.equal((await getJob(crashed.id)).state, 'active');

    const sendEmail = sinon.spy(BatchSendingService.prototype, 'sendEmail');
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
    const resumed = (await findSendJobs(email.id)).find((job) => job.id !== crashed.id);
    await waitUntil(async () => (await getJob(resumed!.id)).state === 'completed');

    // Pinned: BullMQ redelivers the crashed job once its lock expires, and as the
    // email lock accepts `failed` it runs again, but sends nothing new
    await waitUntil(async () => (await getJob(crashed.id)).state === 'completed', 15000);
    const redelivered = await getJob(crashed.id);
    const resumedJob = await getJob(resumed!.id);
    assert.ok(
      redelivered.processedOn! > resumedJob.finishedOn!,
      'redelivered after the resumed send',
    );
    sinon.assert.calledTwice(sendEmail);

    await email.refresh();
    assert.equal(email.get('status'), 'failed');
    assert.equal(mailgun.calls.length, 4);
    await assertSendInvariant(email.id, mailgun);
  });

  it.runIf(outboxEnabled)(
    'keeps a dispatch in the outbox while Redis is paused and sends it once after',
    async function () {
      sinon.stub(logging, 'error');
      const pause = await pauseRedis(3000);

      const email = await createPublishedPostEmail(agent);
      const outboxRows = () => db.knex('jobs_outbox').where('envelope', 'like', `%${email.id}%`);
      assert.equal((await outboxRows()).length, 1);
      await email.refresh();
      assert.equal(email.get('status'), 'pending');

      await delay(pause.endsAt - Date.now() - 300);
      assert.equal(mailgun.calls.length, 0);
      assert.equal((await outboxRows()).length, 1);

      await pause.over;
      await waitForEmailStatus(email.id, { timeout: 15000 });

      await email.refresh();
      assert.equal(email.get('status'), 'submitted');
      assert.equal(mailgun.calls.length, 4);
      await assertSendInvariant(email.id, mailgun);
      await waitUntil(async () => (await outboxRows()).length === 0);
    },
  );

  // Pinned: the timed-out enqueue still lands when the pause ends, and as the
  // email lock accepts `failed`, an email marked failed ends up submitted
  it.skipIf(outboxEnabled)(
    'marks an email failed when Redis is paused at publish, then sends it once when the timed-out job lands',
    async function () {
      sinon.stub(logging, 'error');
      const pause = await pauseRedis(3000);

      const email = await createPublishedPostEmail(agent);
      await waitForEmailStatus(email.id, { timeout: 2500 });
      await email.refresh();
      assert.equal(email.get('status'), 'failed');
      assert.match(email.get('error'), /Timed out enqueueing job/);

      await delay(pause.endsAt - Date.now() - 300);
      assert.equal(mailgun.calls.length, 0);

      await pause.over;
      await waitUntil(async () => {
        await email.refresh();
        return email.get('status') === 'submitted';
      }, 15000);
      assert.equal(mailgun.calls.length, 4);
      await assertSendInvariant(email.id, mailgun);
    },
  );

  it.skipIf(outboxEnabled)(
    'sends a failed email once through a retry when its enqueue never landed',
    async function () {
      sinon.stub(logging, 'error');
      const add = sinon.stub(Queue.prototype, 'add').callsFake(() => new Promise(() => {}));

      const email = await createPublishedPostEmail(agent);
      await waitForEmailStatus(email.id, { timeout: 2500 });
      await email.refresh();
      assert.equal(email.get('status'), 'failed');
      assert.match(email.get('error'), /Timed out enqueueing job/);
      assert.equal(mailgun.calls.length, 0);

      add.restore();
      await retryEmail(agent, email.id);
      await waitUntil(async () => {
        await email.refresh();
        return email.get('status') === 'submitted';
      }, 15000);
      assert.equal(mailgun.calls.length, 4);
      await assertSendInvariant(email.id, mailgun);
    },
  );

  it('completes a send when its Redis connections are dropped mid-send', async function () {
    mailgun.respond = async () => {
      await delay(500);
      return accepted;
    };
    sinon.stub(logging, 'error');

    const email = await createPublishedPostEmail(agent);
    await waitUntil(() => mailgun.calls.length >= 1);
    // BullMQ names blocking connections `<prefix>:<queue>`; the rest use connectionName
    const killed = await killJobsConnections();
    const killedNames = killed.map(({ name }) => name);
    assert.ok(killedNames.includes(getBullMQPrefix()), `dropped only ${killedNames.join(', ')}`);
    await waitForEmailStatus(email.id, { timeout: 15000 });

    await email.refresh();
    assert.equal(email.get('status'), 'submitted');
    assert.equal(mailgun.calls.length, 4);
    await assertSendInvariant(email.id, mailgun);

    const [job] = await findSendJobs(email.id);
    await waitUntil(async () => (await getJob(job.id)).state === 'completed');
    const killedIds = new Set(killed.map(({ id }) => id));
    const reconnected = await withRedisClient(listJobsClients);
    assert.ok(
      reconnected.some(({ id, name }) => name === getBullMQPrefix() && !killedIds.has(id)),
      `no reconnected client among ${reconnected.map(({ name }) => name).join(', ')}`,
    );
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
