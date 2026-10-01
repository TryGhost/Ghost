import { describe, it, beforeAll, beforeEach, afterEach } from 'vitest';
import type { Knex } from 'knex';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import ObjectId from 'bson-objectid';
import sinon from 'sinon';
import logging from '@tryghost/logging';
import type { AutomationRunHistory } from '../../../core/server/services/automations/automations-repository';
import { MEMBER_WELCOME_EMAIL_SLUGS } from '../../../core/server/services/member-welcome-emails/constants';
const models = require('../../../core/server/models');
import { agentProvider, fixtureManager, mockManager } from '../../utils/e2e-framework';
const {
  setupAutomationsFixture,
  cleanupAutomationsFixture,
  NON_EMPTY_EMAIL_LEXICAL,
} = require('../../utils/automations-fixtures');

const newId = () => ObjectId().toHexString();
const date = '2026-09-14 12:00:00';
const isoDate = '2026-09-14T12:00:00.000Z';
const db: Knex = models.Base.knex;

describe('Automation run history API', function () {
  let agent: Awaited<ReturnType<typeof agentProvider.getAdminAPIAgent>>;
  let automationId: string;
  let otherId: string;
  type Revision = {
    id: string;
    action_id: string;
    type: string;
    email_subject: string | null;
    email_lexical: string | null;
    wait_hours: number | null;
  };
  let email: Revision;
  let wait: Revision;
  let member: { id: string; name: string; email: string };

  beforeAll(async function () {
    agent = await agentProvider.getAdminAPIAgent();
    await fixtureManager.init('users');
    await agent.loginAsOwner();
  });

  beforeEach(async function () {
    await setupAutomationsFixture();
    sinon.stub(logging, 'error');
    automationId = (
      await db('automations').where('slug', MEMBER_WELCOME_EMAIL_SLUGS.free).first('id')
    ).id;
    otherId = (await db('automations').where('slug', MEMBER_WELCOME_EMAIL_SLUGS.paid).first('id'))
      .id;
    const revisions: Revision[] = await db('automation_action_revisions as revisions')
      .join('automation_actions as actions', 'actions.id', 'revisions.action_id')
      .where('actions.automation_id', automationId)
      .select('revisions.*', 'actions.type')
      .orderBy('revisions.created_at');
    email = revisions.find((revision) => revision.type === 'send_email')!;
    wait = revisions.find((revision) => revision.type === 'wait')!;
    member = { id: newId(), name: 'Current name', email: 'current@example.com' };
    await db('members').insert({
      ...member,
      uuid: randomUUID(),
      transient_id: newId(),
      created_at: date,
    });
    // History is read from Core, independently of analytics/list availability.
    mockManager.mockLabsDisabled('automationsTinybirdSync');
  });

  afterEach(async function () {
    sinon.restore();
    mockManager.restore();
    await cleanupAutomationsFixture();
    await db('members').where('id', member.id).del();
  });

  async function addRun(owner = automationId) {
    const row = {
      id: newId(),
      automation_id: owner,
      member_id: member.id,
      member_email: 'historical@example.com',
      created_at: date,
      updated_at: date,
    };
    await db('automation_runs').insert(row);
    return row.id;
  }

  async function addStep(
    runId: string,
    status = 'finished',
    overrides: Partial<{
      id: string;
      automation_action_revision_id: string;
      created_at: string;
      ready_at: string;
    }> = {},
  ) {
    const createdAt = overrides.created_at ?? date;
    const row = {
      id: newId(),
      automation_run_id: runId,
      automation_action_revision_id: email.id,
      created_at: createdAt,
      updated_at: createdAt,
      ready_at: createdAt,
      started_at: status === 'pending' ? null : createdAt,
      finished_at: status === 'pending' ? null : createdAt,
      status,
      ...overrides,
    };
    await db('automation_run_steps').insert(row);
    return row;
  }

  async function readRun(id: string): Promise<AutomationRunHistory> {
    const { body } = await agent.get(`automations/${automationId}/runs/${id}`).expectStatus(200);
    return body.automation_run_history[0];
  }

  async function expectReadError(id: string, status: number, type: string, owner = automationId) {
    const { body } = await agent.get(`automations/${owner}/runs/${id}`).expectStatus(status);
    assert.equal(body.automation_run_history, undefined);
    assert.equal(body.errors[0].type, type);
  }

  it('returns the run, current member, and recorded email and wait step contract', async function () {
    const run = await addRun();
    const firstId = '000000000000000000000001';
    const secondId = '000000000000000000000002';
    await addStep(run, 'finished', { id: firstId });
    await addStep(run, 'pending', {
      id: secondId,
      automation_action_revision_id: wait.id,
      ready_at: '2026-09-17 12:00:00',
    });
    const history = await readRun(run);
    assert.deepEqual(history, {
      id: run,
      automation_id: automationId,
      created_at: isoDate,
      member,
      status: 'in_progress',
      failed: false,
      steps: [
        {
          id: firstId,
          automation_action_revision_id: email.id,
          created_at: isoDate,
          updated_at: isoDate,
          ready_at: isoDate,
          started_at: isoDate,
          finished_at: isoDate,
          email_sent_at: null,
          email_delivered_at: null,
          status: 'finished',
          action: {
            id: email.action_id,
            type: 'send_email',
            data: { email_subject: email.email_subject, email_lexical: NON_EMPTY_EMAIL_LEXICAL },
          },
        },
        {
          id: secondId,
          automation_action_revision_id: wait.id,
          created_at: isoDate,
          updated_at: isoDate,
          ready_at: '2026-09-17T12:00:00.000Z',
          started_at: null,
          finished_at: null,
          email_sent_at: null,
          email_delivered_at: null,
          status: 'pending',
          action: { id: wait.action_id, type: 'wait', data: { wait_hours: wait.wait_hours } },
        },
      ],
    });
  });

  it('retains the recorded revision after editing and soft-deleting its action', async function () {
    const run = await addRun();
    await addStep(run);
    await db('automation_action_revisions').insert({
      id: newId(),
      action_id: email.action_id,
      created_at: '2026-09-15 12:00:00',
      email_subject: 'New editing subject',
      email_lexical: 'new content',
    });
    await db('automation_actions').where('id', email.action_id).update({ deleted_at: date });
    const history = await readRun(run);
    assert.equal(history.steps[0].automation_action_revision_id, email.id);
    assert.deepEqual(history.steps[0].action, {
      id: email.action_id,
      type: 'send_email',
      data: { email_subject: email.email_subject, email_lexical: email.email_lexical },
    });
  });

  it('orders by creation time, then step ID for ties, regardless of ready time', async function () {
    const run = await addRun();
    const later = await addStep(run, 'finished', {
      id: '000000000000000000000001',
      created_at: '2026-09-15 12:00:00',
    });
    const tied = await addStep(run, 'finished', { id: '000000000000000000000003' });
    const earlier = await addStep(run, 'finished', {
      id: '000000000000000000000002',
      ready_at: '2026-09-17 12:00:00',
    });
    assert.deepEqual(
      (await readRun(run)).steps.map((step) => step.id),
      [earlier.id, tied.id, later.id],
    );
  });

  async function addRecipient(
    step: { id: string; automation_action_revision_id: string },
    overrides: Record<string, unknown> = {},
  ) {
    await db('automated_email_recipients').insert({
      id: newId(),
      member_id: member.id,
      member_uuid: randomUUID(),
      member_email: 'private-recipient@example.com',
      automation_run_step_id: step.id,
      automation_action_revision_id: step.automation_action_revision_id,
      created_at: date,
      ...overrides,
    });
  }

  it('returns first send and delivery evidence without duplicating retried steps or exposing identity', async function () {
    const run = await addRun();
    const step = await addStep(run);
    await addRecipient(step, {
      created_at: '2026-09-14 12:00:03',
      delivered_at: '2026-09-14 12:00:04',
    });
    await addRecipient(step, {
      created_at: '2026-09-14 12:00:01',
      delivered_at: '2026-09-14 12:00:05',
    });
    await db('members').where('id', member.id).del();
    const history = await readRun(run);
    assert.equal(history.steps.length, 1);
    assert.equal(history.steps[0].email_sent_at, '2026-09-14T12:00:01.000Z');
    assert.equal(history.steps[0].email_delivered_at, '2026-09-14T12:00:04.000Z');
    assert.equal(history.member, null);
    assert.ok(!JSON.stringify(history).includes('private-recipient'));
  });

  it('keeps submission distinct from delivery even while the step is pending', async function () {
    const run = await addRun();
    const step = await addStep(run, 'pending');
    await addRecipient(step);
    const history = await readRun(run);
    assert.equal(history.status, 'in_progress');
    assert.equal(history.steps[0].status, 'pending');
    assert.equal(history.steps[0].email_sent_at, isoDate);
    assert.equal(history.steps[0].email_delivered_at, null);
  });

  it('does not borrow email events from another step or a mismatched revision', async function () {
    const run = await addRun();
    const step = await addStep(run);
    await addRecipient(await addStep(await addRun()), { delivered_at: date });
    const foreign = await db('automation_action_revisions as revisions')
      .join('automation_actions as actions', 'actions.id', 'revisions.action_id')
      .where('actions.automation_id', otherId)
      .first('revisions.id');
    await addRecipient(step, { automation_action_revision_id: foreign.id, delivered_at: date });
    const history = await readRun(run);
    assert.equal(history.steps[0].email_sent_at, null);
    assert.equal(history.steps[0].email_delivered_at, null);
  });

  it('reads repeated entries for the same member separately', async function () {
    const first = await addRun();
    const second = await addRun();
    await addStep(first, 'finished');
    await addStep(second, 'pending');
    const firstHistory = await readRun(first);
    const secondHistory = await readRun(second);
    assert.equal(firstHistory.id, first);
    assert.equal(firstHistory.status, 'completed');
    assert.equal(firstHistory.member?.id, member.id);
    assert.equal(secondHistory.id, second);
    assert.equal(secondHistory.status, 'in_progress');
    assert.equal(secondHistory.member?.id, member.id);
  });

  it('retains a deleted member run without exposing stored historical identity', async function () {
    const run = await addRun();
    await addStep(run);
    await db('members').where('id', member.id).del();
    const history = await readRun(run);
    assert.equal(history.id, run);
    assert.equal(history.member, null);
    assert.equal(history.steps.length, 1);
    assert.ok(!JSON.stringify(history).includes('historical@example.com'));
  });

  it('returns 404 for an unknown run', async function () {
    await expectReadError(newId(), 404, 'NotFoundError');
  });

  it('returns 404 for an unknown automation', async function () {
    await expectReadError(await addRun(), 404, 'NotFoundError', newId());
  });

  it('returns 404 for a run owned by another automation', async function () {
    await expectReadError(await addRun(otherId), 404, 'NotFoundError');
  });

  it.each([
    ['pending', 'in_progress', false],
    ['finished', 'completed', false],
    ['failed', 'exited_early', true],
    ['automation disabled', 'exited_early', false],
    ['member changed status', 'exited_early', false],
    ['member unsubscribed', 'exited_early', false],
  ])(
    'classifies %s history and preserves raw step states',
    async function (stepStatus, status, failed) {
      const run = await addRun();
      await addStep(run, stepStatus);
      const history = await readRun(run);
      assert.equal(history.status, status);
      assert.equal(history.failed, failed);
      assert.equal(history.steps[0].status, stepStatus);
    },
  );

  it('rejects an unknown step status', async function () {
    const run = await addRun();
    await addStep(run, 'unknown status');
    await expectReadError(run, 500, 'InternalServerError');
  });

  it('rejects history with missing revision content', async function () {
    const run = await addRun();
    await addStep(run);
    await db('automation_action_revisions').where('id', email.id).update({ email_lexical: null });
    await expectReadError(run, 500, 'InternalServerError');
  });

  it('preserves empty content as distinct from unavailable content', async function () {
    const run = await addRun();
    const step = await addStep(run, 'pending');
    await db('automation_action_revisions')
      .where('id', step.automation_action_revision_id)
      .update({ email_subject: '', email_lexical: '' });
    const history = await readRun(run);
    assert.deepEqual(history.steps[0].action.data, { email_subject: '', email_lexical: '' });
  });

  it('rejects an unknown action type', async function () {
    const run = await addRun();
    await addStep(run);
    await db('automation_actions').where('id', email.action_id).update({ type: 'future action' });
    await expectReadError(run, 500, 'InternalServerError');
  });

  it('does not disclose revision content belonging to another automation', async function () {
    const foreign = await db('automation_action_revisions as revisions')
      .join('automation_actions as actions', 'actions.id', 'revisions.action_id')
      .where('actions.automation_id', otherId)
      .first('revisions.id');
    const run = await addRun();
    const step = await addStep(run, 'pending', { automation_action_revision_id: foreign.id });
    await addRecipient(step, { delivered_at: date });
    await expectReadError(run, 500, 'InternalServerError');
  });

  it('requires automation read permission before querying history', async function () {
    const run = await addRun();
    const queries: string[] = [];
    const capture = (query: { sql: string }) => queries.push(query.sql);
    await agent.loginAsAuthor();
    db.on('query', capture);
    try {
      await expectReadError(run, 403, 'NoPermissionError');
      assert.ok(queries.every((sql) => !/\bautomation_runs\b|\bautomation_run_steps\b/.test(sql)));
    } finally {
      db.removeListener('query', capture);
      await agent.loginAsOwner();
    }
  });

  it('returns a database error instead of a successful empty history', async function () {
    const run = await addRun();
    const transaction = sinon.stub(db, 'transaction').rejects(new Error('History read failed'));
    await expectReadError(run, 500, 'InternalServerError');
    assert.ok(transaction.calledOnce);
  });
});
