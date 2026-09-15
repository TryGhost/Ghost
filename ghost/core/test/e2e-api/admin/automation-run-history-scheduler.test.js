const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const ObjectId = require('bson-objectid').default;
const sinon = require('sinon');
const models = require('../../../core/server/models');
const {
  createDatabaseAutomationsRepository,
} = require('../../../core/server/services/automations/database-automations-repository');
const { poll } = require('../../../core/server/services/automations/poll');
const { MAX_ATTEMPTS } = require('../../../core/server/services/automations/constants');
const {
  MEMBER_WELCOME_EMAIL_SLUGS,
} = require('../../../core/server/services/member-welcome-emails/constants');
const { agentProvider, fixtureManager, mockManager } = require('../../utils/e2e-framework');
const {
  setupAutomationsFixture,
  cleanupAutomationsFixture,
} = require('../../utils/automations-fixtures');

const db = models.Base.knex;

describe('Automation run history from the scheduler', function () {
  let agent;
  let clock;
  let repository;
  let member;
  let run;
  let pollOptions;

  beforeAll(async function () {
    agent = await agentProvider.getAdminAPIAgent();
    await fixtureManager.init('users');
    await agent.loginAsOwner();
  });

  beforeEach(async function () {
    await setupAutomationsFixture();
    clock = sinon.useFakeTimers({ now: new Date('2026-09-14T12:00:00Z'), toFake: ['Date'] });
    mockManager.mockLabsDisabled('automationsTinybirdSync');
    member = {
      id: ObjectId().toHexString(),
      name: 'Scheduler member',
      email: 'scheduler@example.com',
      uuid: randomUUID(),
      transient_id: ObjectId().toHexString(),
      status: 'free',
      enable_updates_and_announcements: true,
      created_at: new Date(),
    };
    await db('members').insert(member);
    repository = createDatabaseAutomationsRepository({ knex: db, fakeWaitHoursMultiplier: null });
    pollOptions = {
      automationsApi: repository,
      enqueueAnotherPollAt: sinon.stub(),
      scheduleAutomationEmailAnalyticsJob: sinon.stub().resolves(),
      memberWelcomeEmailService: {
        init: sinon.stub(),
        api: { sendAutomationEmail: sinon.stub().resolves({ id: '<history@example.com>' }) },
      },
    };
    await repository.trigger({
      memberId: member.id,
      memberEmail: member.email,
      memberStatus: 'free',
    });
    const automation = await db('automations')
      .where('slug', MEMBER_WELCOME_EMAIL_SLUGS.free)
      .first();
    run = await db('automation_runs')
      .where({ automation_id: automation.id, member_id: member.id })
      .first();
  });

  afterEach(async function () {
    clock.restore();
    sinon.restore();
    mockManager.restore();
    await cleanupAutomationsFixture();
    await db('members').where('id', member.id).del();
  });

  async function readHistory() {
    const { body } = await agent
      .get(`automations/${run.automation_id}/runs/${run.id}`)
      .expectStatus(200);
    return body.automation_run_history[0];
  }

  async function pollAt(date) {
    clock.setSystemTime(new Date(date));
    await poll(pollOptions);
  }

  it('exposes queued waits, successful sends and later delivery as a run progresses to completion', async function () {
    const queued = await readHistory();
    assert.equal(queued.status, 'in_progress');
    assert.equal(queued.steps.length, 1);
    assert.equal(queued.steps[0].action.type, 'wait');
    assert.equal(queued.steps[0].status, 'pending');
    assert.equal(queued.steps[0].ready_at, '2026-09-16T12:00:00.000Z');
    assert.equal(queued.steps[0].finished_at, null);

    await pollAt('2026-09-16T12:00:00Z');
    const readyToSend = await readHistory();
    assert.equal(readyToSend.steps[0].status, 'finished');
    assert.equal(readyToSend.steps[0].finished_at, '2026-09-16T12:00:00.000Z');
    assert.equal(readyToSend.steps[1].action.type, 'send_email');
    assert.equal(readyToSend.steps[1].status, 'pending');
    assert.equal(readyToSend.steps[1].email_sent_at, null);

    await pollAt('2026-09-16T12:00:01Z');
    const sent = await readHistory();
    const email = sent.steps[1];
    assert.equal(sent.status, 'in_progress');
    assert.equal(email.status, 'finished');
    assert.equal(email.email_sent_at, '2026-09-16T12:00:01.000Z');
    assert.equal(email.email_delivered_at, null);
    assert.equal(sent.steps[2].action.type, 'wait');
    assert.equal(sent.steps[2].ready_at, '2026-09-19T12:00:01.000Z');
    assert.equal(sent.steps[2].status, 'pending');

    const recipient = await db('automated_email_recipients')
      .where('automation_run_step_id', email.id)
      .first();
    clock.setSystemTime(new Date('2026-09-16T12:00:04Z'));
    await repository.trackEmailDeliveredAndOpened(
      new Map([
        [
          recipient.id,
          {
            automationActionRevisionId: email.automation_action_revision_id,
            deliveredAt: new Date('2026-09-16T12:00:04Z'),
          },
        ],
      ]),
    );
    const delivered = await readHistory();
    assert.equal(delivered.status, 'in_progress');
    assert.deepEqual(delivered.steps[1], {
      ...email,
      email_delivered_at: '2026-09-16T12:00:04.000Z',
    });

    await pollAt('2026-09-19T12:00:01Z');
    await pollAt('2026-09-19T12:00:02Z');
    const completed = await readHistory();
    assert.equal(completed.status, 'completed');
    assert.equal(completed.history_status, 'available');
    assert.equal(completed.steps.length, 4);
    assert.ok(completed.steps.every((step) => step.status === 'finished'));
    assert.equal(completed.steps[3].email_sent_at, '2026-09-19T12:00:02.000Z');
    sinon.assert.calledTwice(pollOptions.memberWelcomeEmailService.api.sendAutomationEmail);
  });

  it('preserves the send timestamp and later failure timestamp when advancing the run fails', async function () {
    await pollAt('2026-09-16T12:00:00Z');
    const pendingEmail = (await readHistory()).steps[1];
    // Start at the final allowed attempt; the scheduler still acquires the lock
    // and records both the successful send and the terminal failure itself.
    await db('automation_run_steps')
      .where('id', pendingEmail.id)
      .update({ step_attempts: MAX_ATTEMPTS - 1 });
    sinon.stub(repository, 'finishStepAndEnqueueNext').callsFake(async () => {
      clock.setSystemTime(new Date('2026-09-16T12:00:06Z'));
      throw new Error('Could not enqueue the next action');
    });

    await pollAt('2026-09-16T12:00:01Z');
    const history = await readHistory();
    assert.equal(history.status, 'exited_early');
    assert.equal(history.failed, true);
    assert.equal(history.history_status, 'available');
    assert.equal(history.steps.length, 2);
    assert.equal(history.steps[1].status, 'failed');
    assert.equal(history.steps[1].email_sent_at, '2026-09-16T12:00:01.000Z');
    assert.equal(history.steps[1].email_delivered_at, null);
    assert.equal(history.steps[1].finished_at, '2026-09-16T12:00:06.000Z');
    sinon.assert.calledOnce(pollOptions.memberWelcomeEmailService.api.sendAutomationEmail);
  });

  it('retains a deleted member’s pending run and then exposes the scheduler’s exit without sending', async function () {
    await db('members').where('id', member.id).del();
    const pending = await readHistory();
    assert.equal(pending.member, null);
    assert.equal(pending.status, 'in_progress');

    await pollAt('2026-09-16T12:00:00Z');
    const stopped = await readHistory();
    assert.equal(stopped.member, null);
    assert.equal(stopped.status, 'exited_early');
    assert.equal(stopped.failed, false);
    assert.equal(stopped.steps.length, 1);
    assert.equal(stopped.steps[0].status, 'member unsubscribed');
    assert.equal(stopped.steps[0].finished_at, '2026-09-16T12:00:00.000Z');
    sinon.assert.notCalled(pollOptions.memberWelcomeEmailService.api.sendAutomationEmail);
  });
});
