const assert = require('node:assert/strict');
const sinon = require('sinon');

const CheckoutSessionEventService = require('../../../../../../../core/server/services/stripe/services/webhook/checkout-session-event-service');
const { createTracer } = require('../../../../../../../core/server/lib/tracing/create-tracer');
const { createMeter } = require('../../../../../../../core/server/lib/tracing/create-meter');
const { stripeTracking } = require('../../../../../../../core/server/services/stripe/tracking');

const shipNothing = { transport: { metric: async () => null }, logging: { error() {} } };
const tracking = stripeTracking({
  tracer: createTracer(shipNothing),
  meter: createMeter(shipNothing),
});

describe('CheckoutSessionEventService', function () {
  let api, memberRepository, sendSignupEmail, isPaidWelcomeEmailActive;

  beforeEach(function () {
    api = {
      getSubscription: sinon.stub(),
      getCustomer: sinon.stub(),
    };

    memberRepository = {
      get: sinon.stub(),
      create: sinon.stub().resolves({
        id: 'created_member',
      }),
      update: sinon.stub(),
      linkSubscription: sinon.stub(),
      upsertCustomer: sinon.stub(),
      removeComplimentarySubscription: sinon.stub(),
    };

    sendSignupEmail = sinon.stub();
    isPaidWelcomeEmailActive = sinon.stub().resolves(false);
  });

  function createService(deps = {}) {
    return new CheckoutSessionEventService({
      api,
      tracking,
      memberRepository,
      sendSignupEmail,
      isPaidWelcomeEmailActive,
      ...deps,
    });
  }

  describe('completeSubscriptionCheckout', function () {
    let service;
    let session;
    let customer;
    let member;

    beforeEach(function () {
      service = createService();
      session = {
        mode: 'subscription',
        customer: 'cust_123',
        metadata: {
          name: 'Metadata Name',
          newsletters: JSON.stringify([{ id: 1, name: 'Newsletter' }]),
          attribution_id: 'attr_123',
          attribution_url: 'https://example.com',
          attribution_type: 'referral',
          referrer_source: 'google',
          referrer_medium: 'cpc',
          referrer_url: 'https://referrer.com',
          offer: 'offer_123',
          checkoutType: 'new',
        },
      };

      customer = {
        email: 'customer@example.com',
        id: 'cust_123',
        subscriptions: {
          data: [
            {
              default_payment_method: {
                billing_details: { name: 'Customer Name' },
              },
            },
          ],
        },
      };

      member = {
        get: sinon.stub(),
        id: 'member_123',
      };
    });

    it('should get customer and member', async function () {
      api.getCustomer.resolves(customer);
      memberRepository.get.resolves(member);

      await service.completeSubscriptionCheckout(session);

      sinon.assert.calledWith(api.getCustomer, 'cust_123', {
        expand: ['subscriptions.data.default_payment_method'],
      });
      sinon.assert.calledWith(memberRepository.get, { email: 'customer@example.com' });
    });

    it('should create new member if not found', async function () {
      api.getCustomer.resolves(customer);
      memberRepository.get.resolves(null);

      await service.completeSubscriptionCheckout(session);

      sinon.assert.calledOnce(memberRepository.create);
      const memberData = memberRepository.create.getCall(0).args[0];

      assert.equal(memberData.email, 'customer@example.com');

      assert.equal(memberData.name, 'Metadata Name'); // falls back to metadata name if payerName doesn't exist
      assert.deepEqual(memberData.newsletters, [{ id: 1, name: 'Newsletter' }]);
      assert.deepEqual(memberData.attribution, {
        id: 'attr_123',
        url: 'https://example.com',
        type: 'referral',
        referrerSource: 'google',
        referrerMedium: 'cpc',
        referrerUrl: 'https://referrer.com',
      });
    });

    it('should create new member with payerName if it exists', async function () {
      api.getCustomer.resolves(customer);
      memberRepository.get.resolves(null);
      session.metadata.name = 'Session Name';

      await service.completeSubscriptionCheckout(session);

      sinon.assert.calledOnce(memberRepository.create);
      const memberData = memberRepository.create.getCall(0).args[0];

      assert.equal(memberData.email, 'customer@example.com');

      assert.equal(memberData.name, 'Session Name');

      assert.deepEqual(memberData.newsletters, [{ id: 1, name: 'Newsletter' }]);
    });

    it('should create new member with newsletters if metadata newsletters is not valid JSON', async function () {
      api.getCustomer.resolves(customer);
      memberRepository.get.resolves(null);
      session.metadata.newsletters = 'invalid';

      await service.completeSubscriptionCheckout(session);

      const memberData = memberRepository.create.getCall(0).args[0];
      assert.equal(memberData.email, 'customer@example.com');
      assert.equal(memberData.name, 'Metadata Name');
      assert.equal(memberData.newsletters, undefined);
    });

    it('should update member if found', async function () {
      api.getCustomer.resolves(customer);
      memberRepository.get.resolves(member);
      session.metadata.ghostSignupContext = 'already_authenticated';
      // change member name
      customer.subscriptions.data[0].default_payment_method.billing_details.name =
        'New Customer Name';
      await service.completeSubscriptionCheckout(session);

      sinon.assert.calledOnce(memberRepository.update);
      const memberData = memberRepository.update.getCall(0).args[0];
      assert.equal(memberData.name, 'New Customer Name');
    });

    it('should update member with payerName if it exists', async function () {
      api.getCustomer.resolves(customer);
      memberRepository.get.resolves(member);
      session.metadata.ghostSignupContext = 'already_authenticated';
      session.metadata.name = 'Session Name';
      // change member name
      customer.subscriptions.data[0].default_payment_method.billing_details.name =
        'New Customer Name';
      await service.completeSubscriptionCheckout(session);

      sinon.assert.calledOnce(memberRepository.update);
      const memberData = memberRepository.update.getCall(0).args[0];
      assert.equal(memberData.name, 'New Customer Name');
    });

    it('should update member with newsletters if metadata newsletters is not valid JSON', async function () {
      api.getCustomer.resolves(customer);
      memberRepository.get.resolves(member);
      session.metadata.ghostSignupContext = 'already_authenticated';
      session.metadata.newsletters = 'invalid';
      // change member name
      customer.subscriptions.data[0].default_payment_method.billing_details.name =
        'New Customer Name';
      await service.completeSubscriptionCheckout(session);

      sinon.assert.calledOnce(memberRepository.update);
      const memberData = memberRepository.update.getCall(0).args[0];
      assert.equal(memberData.newsletters, undefined);
    });

    it('does not update an existing member from an unverified checkout', async function () {
      api.getCustomer.resolves(customer);
      memberRepository.get.resolves(member);
      session.metadata.ghostSignupContext = 'needs_magic_link_email';

      await service.completeSubscriptionCheckout(session);

      sinon.assert.notCalled(memberRepository.update);
      sinon.assert.calledOnce(memberRepository.linkSubscription);
    });

    it('updates a member created by this checkout from an unverified checkout', async function () {
      api.getCustomer.resolves(customer);
      session.created = 1000;
      session.metadata.ghostSignupContext = 'has_precheckout_magic_link';
      member.get.withArgs('created_at').returns(2000 * 1000);
      member.get.withArgs('id').returns('member_123');
      memberRepository.get.resolves(member);

      await service.completeSubscriptionCheckout(session);

      sinon.assert.calledOnceWithExactly(
        memberRepository.update,
        { name: 'Customer Name' },
        { id: 'member_123' },
      );
    });

    describe('signup email logic', function () {
      it('should send signup email for direct checkout flow even when welcome email is active', async function () {
        api.getCustomer.resolves(customer);
        memberRepository.get.resolves(null);
        session.metadata.ghostSignupContext = 'needs_magic_link_email';
        isPaidWelcomeEmailActive.resolves(true);

        await service.completeSubscriptionCheckout(session);

        sinon.assert.calledOnce(sendSignupEmail);
        sinon.assert.calledWith(sendSignupEmail, 'customer@example.com');
        sinon.assert.notCalled(isPaidWelcomeEmailActive);
      });

      it('should send signup email when flow is has_precheckout_magic_link and welcome email is not active', async function () {
        api.getCustomer.resolves(customer);
        memberRepository.get.resolves(null);
        session.metadata.ghostSignupContext = 'has_precheckout_magic_link';
        isPaidWelcomeEmailActive.resolves(false);

        await service.completeSubscriptionCheckout(session);

        sinon.assert.calledOnce(sendSignupEmail);
        sinon.assert.calledWith(sendSignupEmail, 'customer@example.com');
      });

      it('should NOT send signup email when flow is has_precheckout_magic_link and welcome email is active', async function () {
        api.getCustomer.resolves(customer);
        memberRepository.get.resolves(null);
        session.metadata.ghostSignupContext = 'has_precheckout_magic_link';
        isPaidWelcomeEmailActive.resolves(true);

        await service.completeSubscriptionCheckout(session);

        sinon.assert.notCalled(sendSignupEmail);
      });

      it('should send signup email when flow is already_authenticated and welcome email is not active', async function () {
        api.getCustomer.resolves(customer);
        memberRepository.get.resolves(null);
        session.metadata.ghostSignupContext = 'already_authenticated';
        isPaidWelcomeEmailActive.resolves(false);

        await service.completeSubscriptionCheckout(session);

        sinon.assert.calledOnce(sendSignupEmail);
        sinon.assert.calledWith(sendSignupEmail, 'customer@example.com');
      });

      it('should NOT send signup email when flow is already_authenticated and welcome email is active', async function () {
        api.getCustomer.resolves(customer);
        memberRepository.get.resolves(null);
        session.metadata.ghostSignupContext = 'already_authenticated';
        isPaidWelcomeEmailActive.resolves(true);

        await service.completeSubscriptionCheckout(session);

        sinon.assert.notCalled(sendSignupEmail);
      });

      it('should send signup email when flow metadata is missing for backward compatibility', async function () {
        api.getCustomer.resolves(customer);
        memberRepository.get.resolves(null);
        delete session.metadata.ghostSignupContext;
        isPaidWelcomeEmailActive.resolves(true);

        await service.completeSubscriptionCheckout(session);

        sinon.assert.calledOnce(sendSignupEmail);
        sinon.assert.calledWith(sendSignupEmail, 'customer@example.com');
        sinon.assert.notCalled(isPaidWelcomeEmailActive);
      });

      it('should NOT send signup email on upgrade after a pre-checkout magic link', async function () {
        api.getCustomer.resolves(customer);
        memberRepository.get.resolves(member);
        session.metadata.checkoutType = 'upgrade';
        session.metadata.ghostSignupContext = 'has_precheckout_magic_link';
        isPaidWelcomeEmailActive.resolves(false);

        await service.completeSubscriptionCheckout(session);

        sinon.assert.notCalled(sendSignupEmail);
      });

      it('should send signup email on upgrade when the buyer has no sign-in path', async function () {
        api.getCustomer.resolves(customer);
        memberRepository.get.resolves(member);
        session.metadata.checkoutType = 'upgrade';
        session.metadata.ghostSignupContext = 'needs_magic_link_email';
        isPaidWelcomeEmailActive.resolves(true);

        await service.completeSubscriptionCheckout(session);

        sinon.assert.calledOnceWithExactly(sendSignupEmail, 'customer@example.com');
        sinon.assert.notCalled(isPaidWelcomeEmailActive);
      });

      it('should NOT send signup email on upgrade by a signed-in member', async function () {
        api.getCustomer.resolves(customer);
        memberRepository.get.resolves(member);
        session.metadata.checkoutType = 'upgrade';
        session.metadata.ghostSignupContext = 'already_authenticated';
        isPaidWelcomeEmailActive.resolves(false);

        await service.completeSubscriptionCheckout(session);

        sinon.assert.notCalled(sendSignupEmail);
      });

      it('should NOT send signup email on upgrade without a signup context', async function () {
        api.getCustomer.resolves(customer);
        memberRepository.get.resolves(member);
        session.metadata.checkoutType = 'upgrade';
        delete session.metadata.ghostSignupContext;

        await service.completeSubscriptionCheckout(session);

        sinon.assert.notCalled(sendSignupEmail);
      });
    });
  });
});
