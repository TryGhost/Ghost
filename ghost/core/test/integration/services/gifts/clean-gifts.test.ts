import assert from 'node:assert/strict';
import sinon from 'sinon';
import CleanGiftsJob from '../../../../core/server/services/gifts/jobs/clean-gifts-job';

const logging = require('@tryghost/logging');
const models = require('../../../../core/server/models');
const { agentProvider, fixtureManager } = require('../../../utils/e2e-framework');
const { getInstance: getJobsService } = require('../../../../core/server/services/jobs-service');

async function waitFor(
  check: () => Promise<boolean>,
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

describe('Job: Clean gifts', function () {
  let paidTierId: string;

  beforeAll(async function () {
    await agentProvider.getAdminAPIAgent();
    await fixtureManager.init('newsletters', 'members:newsletters');

    const paidTier = await models.Product.findOne({ type: 'paid' }, { require: true });
    paidTierId = paidTier.id;
  });

  afterEach(async function () {
    await models.Gift.query().del();
    sinon.restore();
  });

  it('expires a purchased gift that is past its expiry date', async function () {
    const past = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const gift = await models.Gift.add({
      token: 'clean-gifts-expired-token',
      buyer_email: 'buyer@example.com',
      buyer_member_id: null,
      buyer_name: 'Gift Buyer',
      recipient_name: null,
      personal_message: null,
      redeemer_member_id: null,
      tier_id: paidTierId,
      cadence: 'year',
      duration: 1,
      currency: 'usd',
      amount: 5000,
      stripe_checkout_session_id: 'cs_clean_gifts',
      stripe_payment_intent_id: 'pi_clean_gifts',
      consumes_at: null,
      expires_at: past,
      status: 'purchased',
      purchased_at: past,
      redeemed_at: null,
      consumed_at: null,
      expired_at: null,
      refunded_at: null,
      consumes_soon_reminder_sent_at: null,
    });

    const loggingInfoSpy = sinon.spy(logging, 'info');

    await getJobsService().dispatch(new CleanGiftsJob());

    const expired = await waitFor(async () => {
      const reloaded = await models.Gift.findOne({ id: gift.id });
      return reloaded.get('status') === 'expired';
    });
    assert.ok(expired, 'The dispatched job expires a gift that is past its expiry date');

    // The gift's status flips mid-job, before the delivery recovery phase and
    // the handler itself resolve, so poll for the lifecycle event too.
    const lifecycleLogged = await waitFor(async () => {
      return loggingInfoSpy.getCalls().some((call) => {
        return (
          call.args[0]?.system?.event === 'job.completed' &&
          call.args[0]?.system?.job_type === 'clean-gifts'
        );
      });
    });
    assert.ok(lifecycleLogged, 'The jobs service logs a structured job.completed lifecycle event');
  });

  // Each phase is isolated so one bad phase cannot cost the others their nightly
  // run, and the counts of the phases that did not run come back null rather
  // than zero, so a wedged phase is visible instead of looking like an idle one.
  it('logs every failing phase and still finishes, reporting their counts as null', async function () {
    const gifts = require('../../../../core/server/services/gifts');
    const failures = {
      processAbandonedCheckouts: new Error('abandoned checkouts phase is broken'),
      processConsumed: new Error('consumed phase is broken'),
      processExpired: new Error('expired phase is broken'),
    };
    for (const [method, err] of Object.entries(failures)) {
      sinon.stub(gifts.service, method).rejects(err);
    }
    const recoverFailure = new Error('delivery recovery is broken');
    sinon.stub(gifts.deliveryService, 'recoverPending').rejects(recoverFailure);

    const loggingInfoSpy = sinon.spy(logging, 'info');
    const loggingErrorSpy = sinon.spy(logging, 'error');

    await getJobsService().dispatch(new CleanGiftsJob());

    const completed = await waitFor(async () => {
      return loggingInfoSpy
        .getCalls()
        .some((call) => call.args[0]?.system?.event === 'clean_gifts.completed');
    });
    assert.ok(completed, 'the job finishes even when every phase throws');

    for (const err of [...Object.values(failures), recoverFailure]) {
      assert.ok(
        loggingErrorSpy.getCalls().some((call) => call.args[0] === err),
        `the failure "${err.message}" is logged`,
      );
    }

    const completion = loggingInfoSpy
      .getCalls()
      .find((call) => call.args[0]?.system?.event === 'clean_gifts.completed');
    assert.ok(completion, 'the completion event is logged');
    const system = completion.args[0].system;
    for (const key of [
      'deleted_checkout_count',
      'consumed_count',
      'expired_count',
      'delivery_sent_count',
    ]) {
      assert.equal(system[key], null, `${key} is null when its phase threw`);
    }
  });

  it('summarises pending gift deliveries when the recovery had something to do', async function () {
    const gifts = require('../../../../core/server/services/gifts');
    sinon
      .stub(gifts.deliveryService, 'recoverPending')
      .resolves({ sentCount: 2, skippedCount: 1, failedCount: 0 });

    const loggingInfoSpy = sinon.spy(logging, 'info');

    await getJobsService().dispatch(new CleanGiftsJob());

    const summarised = await waitFor(async () => {
      return loggingInfoSpy
        .getCalls()
        .some((call) => String(call.args[0]).includes('processed pending gift deliveries'));
    });
    assert.ok(summarised, 'a recovery that did something is summarised in the logs');

    const completion = loggingInfoSpy
      .getCalls()
      .find((call) => call.args[0]?.system?.event === 'clean_gifts.completed');
    assert.ok(completion, 'the completion event is logged');
    assert.equal(completion.args[0].system.delivery_sent_count, 2);
    assert.equal(completion.args[0].system.delivery_skipped_count, 1);
  });
});
