import assert from 'node:assert/strict';
import sinon from 'sinon';
import SendGiftRemindersJob from '../../../../core/server/services/gifts/jobs/send-gift-reminders-job';

const logging = require('@tryghost/logging');
const models = require('../../../../core/server/models');
const { agentProvider, fixtureManager, mockManager } = require('../../../utils/e2e-framework');
const { getInstance: getJobsService } = require('../../../../core/server/services/jobs-service');

const MS_PER_DAY = 24 * 60 * 60 * 1000;

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

interface ReminderSummary {
  reminded_count: number;
  skipped_count: number;
  failed_count: number;
}

// Dispatches the daily reminder job through the real jobs service against a
// booted Ghost. The reminder poll itself is covered by
// test/integration/services/members/send-gift-reminders.test.js; this suite
// proves the job wiring runs that poll and reports its outcome.
describe('Job: Send gift reminders', function () {
  let paidTierId: string;
  let redeemerMember: any;
  let emailMockReceiver: any;
  let loggingInfoSpy: sinon.SinonSpy;
  let giftSequence = 0;

  // dispatch() resolves on enqueue, and the reminder marker is committed before
  // the email is sent, so every assertion waits for the run to finish first.
  function completedRuns(): number {
    return loggingInfoSpy.getCalls().filter((call) => {
      return (
        call.args[0]?.system?.event === 'job.completed' &&
        call.args[0]?.system?.job_type === 'send-gift-reminders'
      );
    }).length;
  }

  function reminderSummaries(): ReminderSummary[] {
    return loggingInfoSpy
      .getCalls()
      .filter((call) => call.args[0]?.system?.event === 'send_gift_reminders.completed')
      .map((call) => {
        const { reminded_count, skipped_count, failed_count } = call.args[0].system;
        return { reminded_count, skipped_count, failed_count };
      });
  }

  async function createRedeemedGift({ consumesAt }: { consumesAt: Date }) {
    giftSequence += 1;
    const now = new Date();

    return await models.Gift.add({
      token: `reminder-job-token-${giftSequence}-${Date.now()}`,
      buyer_email: `gift-buyer-${giftSequence}@example.com`,
      buyer_member_id: null,
      redeemer_member_id: redeemerMember.id,
      tier_id: paidTierId,
      cadence: 'year',
      duration: 1,
      currency: 'usd',
      amount: 5000,
      stripe_checkout_session_id: `cs_reminder_job_${giftSequence}_${Date.now()}`,
      stripe_payment_intent_id: `pi_reminder_job_${giftSequence}_${Date.now()}`,
      consumes_at: consumesAt,
      expires_at: new Date(now.getTime() + 365 * MS_PER_DAY),
      status: 'redeemed',
      purchased_at: now,
      redeemed_at: now,
      consumed_at: null,
      expired_at: null,
      refunded_at: null,
      consumes_soon_reminder_sent_at: null,
    });
  }

  beforeAll(async function () {
    await agentProvider.getAdminAPIAgent();
    await fixtureManager.init('newsletters', 'members:newsletters');

    const paidTier = await models.Product.findOne({ type: 'paid' }, { require: true });
    paidTierId = paidTier.id;
  });

  beforeEach(async function () {
    emailMockReceiver = mockManager.mockMail();
    loggingInfoSpy = sinon.spy(logging, 'info');

    redeemerMember = await models.Member.add({
      email: `gift-reminder-job-${Date.now()}-${Math.random()}@example.com`,
      name: 'Gift Redeemer',
      status: 'gift',
      email_disabled: false,
    });
  });

  afterEach(async function () {
    await models.Gift.query().del();

    if (redeemerMember) {
      await models.Member.destroy({ id: redeemerMember.id });
      redeemerMember = undefined;
    }

    mockManager.restore();
    sinon.restore();
  });

  it('reminds the redeemer of an eligible gift and records the reminder when the dispatched job runs', async function () {
    const gift = await createRedeemedGift({ consumesAt: new Date(Date.now() + 5 * MS_PER_DAY) });

    await getJobsService().dispatch(new SendGiftRemindersJob());

    assert.ok(
      await waitFor(() => completedRuns() === 1),
      'the jobs service logs a job.completed lifecycle event for send-gift-reminders',
    );

    const reloaded = await models.Gift.findOne({ id: gift.id }, { require: true });
    assert.ok(reloaded.get('consumes_soon_reminder_sent_at'), 'the gift is marked as reminded');
    emailMockReceiver.assertSentEmailCount(1);
    const sent = emailMockReceiver.getSentEmail(0);
    assert.equal(sent.to, redeemerMember.get('email'));
    assert.equal(sent.subject, 'Your gift subscription is ending soon');
    assert.deepEqual(reminderSummaries(), [
      { reminded_count: 1, skipped_count: 0, failed_count: 0 },
    ]);
  });

  it('does not remind again when a later run picks up the same gift', async function () {
    const gift = await createRedeemedGift({ consumesAt: new Date(Date.now() + 5 * MS_PER_DAY) });

    await getJobsService().dispatch(new SendGiftRemindersJob());
    assert.ok(await waitFor(() => completedRuns() === 1), 'the first run completes');
    const remindedAt = new Date(
      (await models.Gift.findOne({ id: gift.id }, { require: true })).get(
        'consumes_soon_reminder_sent_at',
      ),
    );

    await getJobsService().dispatch(new SendGiftRemindersJob());
    assert.ok(await waitFor(() => completedRuns() === 2), 'the second run completes');

    emailMockReceiver.assertSentEmailCount(1);
    const reloaded = await models.Gift.findOne({ id: gift.id }, { require: true });
    assert.equal(
      new Date(reloaded.get('consumes_soon_reminder_sent_at')).getTime(),
      remindedAt.getTime(),
      'the reminder marker is left untouched by the second run',
    );
    assert.deepEqual(reminderSummaries(), [
      { reminded_count: 1, skipped_count: 0, failed_count: 0 },
      { reminded_count: 0, skipped_count: 0, failed_count: 0 },
    ]);
  });

  it('reports a failed reminder poll as a failed job rather than a completion', async function () {
    const gifts = require('../../../../core/server/services/gifts');
    sinon.stub(gifts.service, 'processReminders').rejects(new Error('reminder poll is broken'));
    const loggingErrorSpy = sinon.spy(logging, 'error');

    await getJobsService().dispatch(new SendGiftRemindersJob());

    const failed = await waitFor(() => {
      return loggingErrorSpy.getCalls().some((call) => {
        return String(call.args[1]).startsWith('[Background Job] send-gift-reminders failed after');
      });
    });
    assert.ok(failed, 'the jobs service logs the failed run');
    assert.equal(completedRuns(), 0, 'a failed run is not reported as completed');
    assert.deepEqual(reminderSummaries(), []);
    emailMockReceiver.assertSentEmailCount(0);
  });
});
