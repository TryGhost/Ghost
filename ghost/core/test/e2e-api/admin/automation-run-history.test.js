const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const ObjectId = require('bson-objectid').default;
const sinon = require('sinon');
const errors = require('@tryghost/errors');
const models = require('../../../core/server/models');
const { agentProvider, fixtureManager, mockManager } = require('../../utils/e2e-framework');
const {
  setupAutomationsFixture,
  cleanupAutomationsFixture,
  NON_EMPTY_EMAIL_LEXICAL,
} = require('../../utils/automations-fixtures');

const newId = () => ObjectId().toHexString();
const date = '2026-09-14 12:00:00';
const isoDate = '2026-09-14T12:00:00.000Z';
const db = models.Base.knex;

describe('Automation run history API', function () {
  let agent;
  let automationId;
  let otherId;
  let revisions;
  let member;

  beforeAll(async function () {
    agent = await agentProvider.getAdminAPIAgent();
    await fixtureManager.init('users');
    await agent.loginAsOwner();
  });

  beforeEach(async function () {
    await setupAutomationsFixture();
    [automationId, otherId] = (await db('automations').select('id')).map((row) => row.id);
    revisions = await db('automation_action_revisions as revisions')
      .join('automation_actions as actions', 'actions.id', 'revisions.action_id')
      .where('actions.automation_id', automationId)
      .select('revisions.*', 'actions.type');
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
    mockManager.restore();
    await cleanupAutomationsFixture();
    await db('members').where('id', member.id).del();
  });

  async function addRun(owner = automationId) {
    const id = newId();
    await db('automation_runs').insert({
      id,
      automation_id: owner,
      member_id: member.id,
      member_email: 'historical@example.com',
      created_at: date,
      updated_at: date,
    });
    return id;
  }

  async function addStep(runId, status = 'finished', overrides = {}) {
    const row = {
      id: newId(),
      automation_run_id: runId,
      automation_action_revision_id: revisions.find((r) => r.type === 'send_email').id,
      created_at: date,
      updated_at: date,
      ready_at: date,
      started_at: status === 'pending' ? null : date,
      finished_at: status === 'pending' ? null : date,
      status,
      ...overrides,
    };
    await db('automation_run_steps').insert(row);
    return row;
  }

  async function readRun(id, status = 200, owner = automationId) {
    const { body } = await agent.get(`automations/${owner}/runs/${id}`).expectStatus(status);
    return body.automation_run_history?.[0];
  }

  it('returns ordered recorded steps and their original revisions after workflow edits', async function () {
    const run = await addRun();
    const email = revisions.find((r) => r.type === 'send_email');
    const wait = revisions.find((r) => r.type === 'wait');
    const firstId = '000000000000000000000001';
    const secondId = '000000000000000000000002';
    // Insert reverse order and use differing ready times to prove entry ordering.
    await addStep(run, 'pending', {
      id: secondId,
      automation_action_revision_id: wait.id,
      ready_at: '2026-09-17 12:00:00',
    });
    await addStep(run, 'finished', { id: firstId });
    await db('automation_action_revisions').insert({
      id: newId(),
      action_id: email.action_id,
      created_at: '2026-09-15 12:00:00',
      email_subject: 'New editing subject',
      email_lexical: 'new content',
    });
    await db('automation_actions').where('id', email.action_id).update({ deleted_at: date });
    const history = await readRun(run);
    assert.deepEqual(history, {
      id: run,
      automation_id: automationId,
      created_at: isoDate,
      member,
      status: 'in_progress',
      failed: false,
      history_status: 'available',
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

  it('orders by creation time before the step ID tie-breaker', async function () {
    const run = await addRun();
    const later = await addStep(run, 'finished', {
      id: '000000000000000000000001',
      created_at: '2026-09-15 12:00:00',
    });
    const earlier = await addStep(run, 'finished', { id: '000000000000000000000002' });
    assert.deepEqual(
      (await readRun(run)).steps.map((step) => step.id),
      [earlier.id, later.id],
    );
  });

  async function addRecipient(step, overrides = {}) {
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
      delivered_at: '2026-09-14 12:00:05',
    });
    await addRecipient(step, {
      created_at: '2026-09-14 12:00:01',
      delivered_at: '2026-09-14 12:00:04',
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
    await addRecipient(await addStep(await addRun()));
    const foreign = await db('automation_action_revisions as revisions')
      .join('automation_actions as actions', 'actions.id', 'revisions.action_id')
      .where('actions.automation_id', otherId)
      .first('revisions.id');
    await addRecipient(step, { automation_action_revision_id: foreign.id });
    const history = await readRun(run);
    assert.equal(history.steps[0].email_sent_at, null);
    assert.equal(history.steps[0].email_delivered_at, null);
  });

  it('reads repeated entries separately without relying on visible list pages', async function () {
    const first = await addRun();
    const second = await addRun();
    await addStep(first, 'finished');
    await addStep(second, 'pending');
    for (let i = 0; i < 11; i += 1) {
      await addRun();
    }
    assert.equal((await readRun(first)).status, 'completed');
    assert.equal((await readRun(second)).status, 'in_progress');
    assert.equal((await readRun(first)).member.id, member.id);
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

  it('distinguishes an empty history from missing runs and automations', async function () {
    const run = await addRun();
    const history = await readRun(run);
    assert.equal(history.history_status, 'empty');
    assert.equal(history.status, 'unclassified');
    assert.deepEqual(history.steps, []);
    await readRun(newId(), 404);
    await readRun(run, 404, newId());
    await readRun(await addRun(otherId), 404);
  });

  it.each([
    [['finished'], 'completed', false],
    [['failed'], 'exited_early', true],
    [['automation disabled'], 'exited_early', false],
    [['member changed status'], 'exited_early', false],
    [['member unsubscribed'], 'exited_early', false],
    [['failed', 'pending'], 'in_progress', false],
    [['future status', 'pending'], 'in_progress', false],
    [['finished', 'future status'], 'unclassified', false],
    [['failed', 'future status'], 'unclassified', false],
  ])('classifies %j with the list status rules', async function (statuses, status, failed) {
    const run = await addRun();
    for (const stepStatus of statuses) {
      await addStep(run, stepStatus);
    }
    const history = await readRun(run);
    assert.equal(history.status, status);
    assert.equal(history.failed, failed);
    assert.deepEqual(
      history.steps.map((step) => step.status),
      statuses,
    );
    assert.equal(
      history.history_status,
      statuses.includes('future status') ? 'partial' : 'available',
    );
  });

  it('keeps missing revision content and missing terminal timestamps explicit', async function () {
    const run = await addRun();
    const step = await addStep(run, 'finished', { finished_at: null });
    await db('automation_action_revisions')
      .where('id', step.automation_action_revision_id)
      .update({ email_subject: '', email_lexical: null });
    const history = await readRun(run);
    assert.equal(history.history_status, 'partial');
    assert.equal(history.steps[0].finished_at, null);
    assert.deepEqual(history.steps[0].action.data, { email_subject: '', email_lexical: null });
  });

  it('preserves empty content as distinct from unavailable content', async function () {
    const run = await addRun();
    const step = await addStep(run, 'pending');
    await db('automation_action_revisions')
      .where('id', step.automation_action_revision_id)
      .update({ email_subject: '', email_lexical: '' });
    const history = await readRun(run);
    assert.equal(history.history_status, 'available');
    assert.deepEqual(history.steps[0].action.data, { email_subject: '', email_lexical: '' });
  });

  it('retains unknown action history without pretending it is a supported card', async function () {
    const run = await addRun();
    const step = await addStep(run);
    const revision = revisions.find((r) => r.id === step.automation_action_revision_id);
    await db('automation_actions')
      .where('id', revision.action_id)
      .update({ type: 'future action' });
    const history = await readRun(run);
    assert.equal(history.history_status, 'partial');
    assert.equal(history.steps[0].action, null);
    assert.equal(history.steps[0].id, step.id);
  });

  it('does not disclose revision content belonging to another automation', async function () {
    const foreign = await db('automation_action_revisions as revisions')
      .join('automation_actions as actions', 'actions.id', 'revisions.action_id')
      .where('actions.automation_id', otherId)
      .first('revisions.id');
    const run = await addRun();
    await addStep(run, 'pending', { automation_action_revision_id: foreign.id });
    const history = await readRun(run);
    assert.equal(history.history_status, 'partial');
    assert.equal(history.steps[0].action, null);
  });

  it('requires automation read permission before querying history', async function () {
    const run = await addRun();
    const queries = [];
    const capture = (query) => queries.push(query.sql);
    await agent.loginAsAuthor();
    db.on('query', capture);
    try {
      await readRun(run, 403);
      assert.ok(queries.every((sql) => !/\bautomation_runs\b|\bautomation_run_steps\b/.test(sql)));
    } finally {
      db.removeListener('query', capture);
      await agent.loginAsOwner();
    }
  });

  it('returns a read error instead of a successful empty history when step lookup fails', async function () {
    const run = await addRun();
    // Transactions construct a client from this prototype rather than reusing
    // the root client, so inject the failure at their shared query boundary.
    const clientPrototype = Object.getPrototypeOf(db.client);
    const query = clientPrototype.query;
    let failedLookup = false;
    const stub = sinon.stub(clientPrototype, 'query').callsFake(function (connection, statement) {
      const sql = typeof statement === 'string' ? statement : statement.sql;
      if (sql.includes('from `automation_run_steps`')) {
        failedLookup = true;
        return Promise.reject(new errors.InternalServerError({ message: 'History read failed.' }));
      }
      return query.call(this, connection, statement);
    });
    try {
      const { body } = await agent.get(`automations/${automationId}/runs/${run}`).expectStatus(500);
      assert.equal(body.automation_run_history, undefined);
      assert.equal(body.errors[0].type, 'InternalServerError');
      assert.ok(failedLookup);
    } finally {
      stub.restore();
    }
  });
});
