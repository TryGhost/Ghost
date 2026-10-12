import assert from 'node:assert/strict';
import { setImmediate } from 'node:timers/promises';
import sinon from 'sinon';
import type { DonationBookshelfRepository } from '../../../../../core/server/services/donations/donation-bookshelf-repository';
import type { DonationPaymentEvent } from '../../../../../core/server/services/donations/donation-payment-event';

// Keep the real CommonJS identities used by the wrapper and Stripe's composition.
const models = require('../../../../../core/server/models');
const StripeService = require('../../../../../core/server/services/stripe/stripe-service');
const labs = require('../../../../../core/shared/labs');
const settingsCache = require('../../../../../core/shared/settings-cache');
const ROOT_PATH = require.resolve('../../../../../core/server/services/donations');

type DonationsRoot = {
  init(): void;
  repository?: DonationBookshelfRepository;
};

function donationSession() {
  return {
    mode: 'payment',
    customer: null,
    customer_details: { name: 'A reader', email: 'reader@example.com' },
    amount_total: 2500,
    currency: 'gbp',
    custom_fields: [{ key: 'donation_message', text: { value: 'Keep writing' } }],
    metadata: { ghost_donation: 'true', utm_source: 'newsletter' },
  };
}

describe('donations root with its Stripe consumer', function () {
  const sandbox = sinon.createSandbox();
  let previousModule: NodeJS.Module | undefined;
  let root: DonationsRoot;
  let stripe: InstanceType<typeof StripeService>;
  let add: sinon.SinonStub;
  let notifyDonationReceived: sinon.SinonStub<
    [{ donationPaymentEvent: DonationPaymentEvent }],
    Promise<void>
  >;

  beforeEach(function () {
    previousModule = require.cache[ROOT_PATH];
    delete require.cache[ROOT_PATH];
    add = sandbox.stub(models.DonationPaymentEvent, 'add').resolves({ id: 'saved-donation' });
    notifyDonationReceived = sandbox
      .stub<[{ donationPaymentEvent: DonationPaymentEvent }], Promise<void>>()
      .resolves();
    root = require(ROOT_PATH);

    // Boot constructs Stripe before initializing donations. The consumer must
    // look up the repository later, when the checkout webhook arrives.
    stripe = new StripeService({
      labs,
      settingsCache,
      models,
      donationService: root,
      membersService: { api: { members: {} } },
      giftService: {},
      staffService: { api: { emails: { notifyDonationReceived } } },
      StripeWebhook: {},
    });
  });

  afterEach(function () {
    sandbox.restore();
    // Other suites may retain the old root. Restore its full cache entry,
    // rather than leaving them with a different instance from future imports.
    delete require.cache[ROOT_PATH];
    if (previousModule) {
      require.cache[ROOT_PATH] = previousModule;
    }
  });

  it('imports without a repository or writes, and keeps one repository across repeated init', function () {
    assert.equal(require(ROOT_PATH), root);
    assert.equal(root.repository, undefined);
    sinon.assert.notCalled(add);
    sinon.assert.notCalled(notifyDonationReceived);

    root.init();
    const repository = root.repository;
    assert.ok(repository);
    root.init();

    assert.equal(root.repository, repository);
    sinon.assert.notCalled(add);
    sinon.assert.notCalled(notifyDonationReceived);
  });

  it('lets the earlier Stripe consumer save and notify through the initialized repository', async function () {
    root.init();
    assert.ok(root.repository);
    const save = sandbox.spy(root.repository, 'save');

    const result =
      await stripe.webhookController.checkoutSessionEventService.handleEvent(donationSession());

    assert.equal(result, undefined);
    sinon.assert.calledOnce(save);
    assert.equal(await save.firstCall.returnValue, undefined);
    sinon.assert.calledOnceWithExactly(add, {
      name: 'A reader',
      email: 'reader@example.com',
      member_id: null,
      amount: 2500,
      currency: 'gbp',
      donation_message: 'Keep writing',
      attribution_id: null,
      attribution_url: null,
      attribution_type: null,
      referrer_source: null,
      referrer_medium: null,
      referrer_url: null,
      utm_source: 'newsletter',
      utm_medium: null,
      utm_campaign: null,
      utm_term: null,
      utm_content: null,
    });
    sinon.assert.calledOnce(notifyDonationReceived);
    sinon.assert.calledWithExactly(notifyDonationReceived, {
      donationPaymentEvent: save.firstCall.args[0],
    });
  });

  it('keeps checkout handling pending and does not notify staff until the model write finishes', async function () {
    let releaseWrite!: () => void;
    const write = new Promise<void>((resolve) => {
      releaseWrite = resolve;
    });
    add.returns(write);
    root.init();

    let completed = false;
    const handling: Promise<void> = stripe.webhookController.checkoutSessionEventService
      .handleEvent(donationSession())
      .then(() => {
        completed = true;
      });
    const settled = handling.catch(() => {});

    try {
      // Allow the handler's promise continuations to run while the write stays
      // held, so a missing await cannot pass on an early assertion.
      await setImmediate();
      sinon.assert.calledOnce(add);
      assert.equal(completed, false, 'Checkout handling finished before the donation was saved');
      sinon.assert.notCalled(notifyDonationReceived);

      releaseWrite();
      await handling;
      sinon.assert.calledOnce(notifyDonationReceived);
    } finally {
      releaseWrite();
      await settled;
    }
  });

  it('propagates the model write failure unchanged without notifying staff', async function () {
    const failure = new Error('The donation could not be saved');
    add.rejects(failure);
    root.init();

    await assert.rejects(
      stripe.webhookController.checkoutSessionEventService.handleEvent(donationSession()),
      (error: unknown) => error === failure,
    );

    sinon.assert.calledOnce(add);
    sinon.assert.notCalled(notifyDonationReceived);
  });
});
