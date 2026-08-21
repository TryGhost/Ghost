import assert from 'node:assert/strict';
import sinon from 'sinon';
import { GiftService } from '../../../../../core/server/services/gifts/gift-service';
import { buildGift } from './utils';

function hasInvalidDeliveryContext(error: unknown): boolean {
  const context =
    error && typeof error === 'object' ? (error as { context?: unknown }).context : null;
  return typeof context === 'string' && context.startsWith('Invalid gift delivery data:');
}

function hasInvalidBuyerEmailContext(error: unknown): boolean {
  const context =
    error && typeof error === 'object' ? (error as { context?: unknown }).context : null;
  return typeof context === 'string' && context.startsWith('Invalid gift buyer email:');
}

describe('GiftService interface', function () {
  afterEach(function () {
    sinon.restore();
  });

  function createService({
    customizationEnabled = false,
    portalPlans = ['monthly', 'yearly'],
  } = {}) {
    const tier = {
      id: {
        toHexString: () => 'tier_1',
      },
      name: 'Gold',
      status: 'active',
      visibility: 'public',
      type: 'paid',
      currency: 'USD',
      monthlyPrice: 1000,
      yearlyPrice: 12000,
      getPrice: sinon.stub().callsFake((cadence: string) => (cadence === 'month' ? 1000 : 12000)),
      toJSON: () => ({
        id: 'tier_1',
        name: 'Gold',
        description: 'All access',
        benefits: ['Everything'],
      }),
    };
    const giftRepository = {
      create: sinon.stub().resolves('gift_1'),
      update: sinon.stub().resolves(),
      deletePendingCheckout: sinon.stub().resolves(true),
      getByToken: sinon.stub().resolves(null),
      getActiveByMember: sinon.stub().resolves(null),
      getActiveByMembers: sinon.stub().resolves(new Map()),
      browsePurchaseEvents: sinon.stub().resolves({ data: [], meta: { pagination: { page: 1 } } }),
      browseRedemptionEvents: sinon
        .stub()
        .resolves({ data: [], meta: { pagination: { page: 1 } } }),
      transaction: sinon.stub().callsFake(async (callback) => callback('trx')),
    };
    const checkoutAdapter = {
      getCustomerId: sinon.stub().resolves('cus_123'),
      createSession: sinon
        .stub()
        .resolves({ id: 'cs_123', url: 'https://checkout.stripe.test/session' }),
    };
    const giftDeliveryService = {
      createForCheckout: sinon.stub().resolves(),
      dispatchForGift: sinon.stub().resolves(null),
      cancelPendingForGift: sinon.stub().resolves(false),
    };
    const service = new GiftService({
      giftRepository,
      giftDeliveryService,
      memberRepository: {},
      tiersService: {
        api: {
          read: sinon.stub().resolves(tier),
        },
      },
      giftEmailService: {},
      staffServiceEmails: {},
      giftReminderScheduler: {},
      checkoutAdapter,
      labsService: {
        isSet: sinon.stub().withArgs('giftSubCustomization').returns(customizationEnabled),
      },
      settingsCache: {
        get: sinon.stub().withArgs('portal_plans').returns(portalPlans),
      },
    } as any);

    return {
      service,
      tier,
      giftRepository,
      checkoutAdapter,
      giftDeliveryService,
    };
  }

  it('owns the complete gift checkout decision', async function () {
    const { service, checkoutAdapter, giftRepository } = createService();

    const result = await service.startCheckout({
      tierId: 'tier_1',
      cadence: 'year',
      duration: 1,
      successUrl: 'https://example.com/',
      cancelUrl: 'https://example.com/cancel/',
      buyer: {
        memberId: 'member_1',
        email: 'buyer@example.com',
        name: 'Buyer',
        isAuthenticated: true,
      },
    });

    assert.deepEqual(result, { url: 'https://checkout.stripe.test/session' });
    sinon.assert.calledOnceWithExactly(checkoutAdapter.getCustomerId, {
      memberId: 'member_1',
      email: 'buyer@example.com',
      name: 'Buyer',
      isAuthenticated: true,
    });

    const plan = checkoutAdapter.createSession.firstCall.firstArg;
    const successUrl = new URL(plan.successUrl);

    assert.equal(plan.amount, 12000);
    assert.equal(plan.currency, 'usd');
    assert.equal(plan.customerId, 'cus_123');
    assert.deepEqual(plan.metadata, { ghost_gift_id: 'gift_1' });
    assert.equal(plan.idempotencyKey, 'gift_1');
    const createdGift = giftRepository.create.firstCall.firstArg;
    assert.match(createdGift.token, /^[A-Za-z0-9]{12}$/);
    assert.equal(createdGift.status, 'payment_pending');
    assert.equal(successUrl.searchParams.get('stripe'), 'gift-purchase-success');
    assert.equal(successUrl.searchParams.get('gift_token'), createdGift.token);
    assert.equal(successUrl.searchParams.get('gift_tier'), 'tier_1');
    assert.equal(successUrl.searchParams.get('gift_cadence'), 'year');
    assert.equal(successUrl.searchParams.get('gift_duration'), null);
    assert.equal(successUrl.searchParams.get('gift_delivery'), 'link');
  });

  it('validates email delivery and keeps recipient PII out of Stripe metadata', async function () {
    const { service, checkoutAdapter, giftRepository, giftDeliveryService } = createService({
      customizationEnabled: true,
    });

    await service.startCheckout({
      tierId: 'tier_1',
      cadence: 'year',
      deliveryMethod: 'email',
      recipientEmail: ' recipient@example.com ',
      recipientName: ' Recipient ',
      buyerName: ' Buyer ',
      personalMessage: ' Enjoy your gift ',
      successUrl: 'https://example.com/',
      buyer: {
        memberId: null,
        email: 'buyer@example.com',
        name: null,
        isAuthenticated: false,
      },
    });

    const metadata = checkoutAdapter.createSession.firstCall.firstArg.metadata;
    const successUrl = new URL(checkoutAdapter.createSession.firstCall.firstArg.successUrl);
    assert.deepEqual(metadata, { ghost_gift_id: 'gift_1' });
    const createdGift = giftRepository.create.firstCall.firstArg;
    assert.equal(createdGift.recipientName, 'Recipient');
    assert.equal(createdGift.buyerName, 'Buyer');
    assert.equal(createdGift.personalMessage, 'Enjoy your gift');
    sinon.assert.calledOnceWithExactly(
      giftDeliveryService.createForCheckout,
      {
        giftId: 'gift_1',
        recipientEmail: 'recipient@example.com',
      },
      { transacting: 'trx' },
    );
    assert.equal(successUrl.searchParams.get('gift_delivery'), 'email');
  });

  it('prefers the checkout buyer name over the authenticated member name', async function () {
    const { service, giftRepository } = createService({ customizationEnabled: true });

    await service.startCheckout({
      tierId: 'tier_1',
      cadence: 'year',
      deliveryMethod: 'email',
      recipientEmail: 'recipient@example.com',
      buyerName: 'Mum',
      successUrl: 'https://example.com/',
      buyer: {
        memberId: 'member_1',
        email: 'buyer@example.com',
        name: 'Account Name',
        isAuthenticated: true,
      },
    });

    assert.equal(giftRepository.create.firstCall.firstArg.buyerName, 'Mum');
  });

  const invalidCheckouts = [
    {
      name: 'email delivery without a buyer name',
      overrides: { deliveryMethod: 'email', recipientEmail: 'recipient@example.com' },
      expected: hasInvalidDeliveryContext,
    },
    {
      name: 'email delivery with a malformed recipient email',
      overrides: { deliveryMethod: 'email', recipientEmail: 'not-an-email', buyerName: 'Buyer' },
      expected: hasInvalidDeliveryContext,
    },
    {
      name: 'a personal message over the length limit',
      overrides: {
        deliveryMethod: 'email',
        recipientEmail: 'recipient@example.com',
        buyerName: 'Buyer',
        personalMessage: 'x'.repeat(251),
      },
      expected: hasInvalidDeliveryContext,
    },
    {
      name: 'email-only fields in link mode',
      overrides: { deliveryMethod: 'link', recipientEmail: 'recipient@example.com' },
      expected: hasInvalidDeliveryContext,
    },
    {
      name: 'a buyer without an email',
      overrides: {
        deliveryMethod: 'link',
        buyer: { memberId: null, email: null, name: null, isAuthenticated: false },
      },
      expected: hasInvalidBuyerEmailContext,
    },
  ];

  for (const { name, overrides, expected } of invalidCheckouts) {
    it(`rejects ${name}`, async function () {
      const { service, checkoutAdapter } = createService({ customizationEnabled: true });

      await assert.rejects(
        () =>
          service.startCheckout({
            tierId: 'tier_1',
            cadence: 'year',
            successUrl: 'https://example.com/',
            buyer: {
              memberId: 'member_1',
              email: 'buyer@example.com',
              name: 'Account Name',
              isAuthenticated: true,
            },
            ...overrides,
          }),
        expected,
      );

      sinon.assert.notCalled(checkoutAdapter.createSession);
    });
  }

  it('keeps link gifts anonymous when buyer name is omitted', async function () {
    const { service, giftRepository } = createService({ customizationEnabled: true });

    await service.startCheckout({
      tierId: 'tier_1',
      cadence: 'year',
      deliveryMethod: 'link',
      recipientEmail: '',
      recipientName: '   ',
      personalMessage: '',
      successUrl: 'https://example.com/',
      buyer: {
        memberId: 'member_1',
        email: 'buyer@example.com',
        name: 'Account Name',
        isAuthenticated: true,
      },
    });

    const gift = giftRepository.create.firstCall.firstArg;
    assert.equal(gift.buyerName, null);
    assert.equal(gift.recipientName, null);
    assert.equal(gift.personalMessage, null);
  });

  it('keeps omitted and explicit link delivery compatible while the flag is disabled', async function () {
    const { service, checkoutAdapter } = createService();
    const base = {
      tierId: 'tier_1',
      cadence: 'year',
      successUrl: 'https://example.com/',
      buyer: {
        memberId: null,
        email: 'buyer@example.com',
        name: null,
        isAuthenticated: false,
      },
    };

    await service.startCheckout(base);
    await service.startCheckout({ ...base, deliveryMethod: 'link' });
    await assert.rejects(
      () =>
        service.startCheckout({
          ...base,
          deliveryMethod: 'email',
          recipientEmail: 'recipient@example.com',
        }),
      { context: 'Gift email delivery is not available' },
    );
    await assert.rejects(
      () =>
        service.startCheckout({
          ...base,
          buyerName: 'Buyer',
        }),
      { context: 'Gift email delivery is not available' },
    );
    assert.equal(checkoutAdapter.createSession.callCount, 2);
  });

  for (const duration of [3, 6]) {
    it(`owns the customized ${duration}-month checkout decision`, async function () {
      const { service, checkoutAdapter } = createService({ customizationEnabled: true });

      await service.startCheckout({
        tierId: 'tier_1',
        duration,
        successUrl: 'https://example.com/',
        buyer: {
          memberId: null,
          email: 'buyer@example.com',
          name: null,
          isAuthenticated: false,
        },
      });

      const plan = checkoutAdapter.createSession.firstCall.firstArg;
      const successUrl = new URL(plan.successUrl);

      assert.equal(plan.cadence, 'month');
      assert.equal(plan.duration, duration);
      assert.equal(plan.amount, 1000 * duration);
      assert.deepEqual(plan.metadata, { ghost_gift_id: 'gift_1' });
      assert.equal(successUrl.searchParams.get('gift_duration'), String(duration));
    });
  }

  it('ignores customized duration input while the flag is disabled', async function () {
    const { service, checkoutAdapter } = createService();

    await service.startCheckout({
      tierId: 'tier_1',
      cadence: 'year',
      duration: 3,
      successUrl: 'https://example.com/',
      buyer: {
        memberId: null,
        email: 'buyer@example.com',
        name: null,
        isAuthenticated: false,
      },
    });

    const plan = checkoutAdapter.createSession.firstCall.firstArg;
    const successUrl = new URL(plan.successUrl);

    assert.equal(plan.cadence, 'year');
    assert.equal(plan.duration, 1);
    assert.equal(plan.amount, 12000);
    assert.equal(successUrl.searchParams.get('gift_duration'), null);
  });

  it('keeps cadence-only clients compatible while customization is enabled', async function () {
    const { service, checkoutAdapter } = createService({ customizationEnabled: true });

    await service.startCheckout({
      tierId: 'tier_1',
      cadence: 'year',
      successUrl: 'https://example.com/',
      buyer: {
        memberId: null,
        email: 'buyer@example.com',
        name: null,
        isAuthenticated: false,
      },
    });

    const plan = checkoutAdapter.createSession.firstCall.firstArg;
    const successUrl = new URL(plan.successUrl);

    assert.equal(plan.cadence, 'year');
    assert.equal(plan.duration, 1);
    assert.equal(plan.amount, 12000);
    assert.equal(successUrl.searchParams.get('gift_duration'), '12');
  });

  it('enforces the Portal plan gate for explicit customized durations', async function () {
    const { service, checkoutAdapter } = createService({
      customizationEnabled: true,
      portalPlans: ['yearly'],
    });

    await assert.rejects(
      () =>
        service.startCheckout({
          tierId: 'tier_1',
          duration: 3,
          successUrl: 'https://example.com/',
          buyer: {
            memberId: null,
            email: 'buyer@example.com',
            name: null,
            isAuthenticated: false,
          },
        }),
      { context: 'The monthly Portal plan is not available' },
    );

    sinon.assert.notCalled(checkoutAdapter.createSession);
  });

  it('rejects unsupported or conflicting customized durations', async function () {
    const { service, checkoutAdapter } = createService({ customizationEnabled: true });
    const buyer = {
      memberId: null,
      email: 'buyer@example.com',
      name: null,
      isAuthenticated: false,
    };

    await assert.rejects(
      () =>
        service.startCheckout({
          tierId: 'tier_1',
          duration: 2,
          successUrl: 'https://example.com/',
          buyer,
        }),
      { context: 'Unsupported gift duration "2"' },
    );
    await assert.rejects(
      () =>
        service.startCheckout({
          tierId: 'tier_1',
          cadence: 'year',
          duration: 3,
          successUrl: 'https://example.com/',
          buyer,
        }),
      { context: 'Gift duration "3" conflicts with cadence "year"' },
    );

    sinon.assert.notCalled(checkoutAdapter.createSession);
  });

  it('rejects offers before reaching the checkout adapter', async function () {
    const { service, checkoutAdapter } = createService();

    await assert.rejects(
      () =>
        service.startCheckout({
          tierId: 'tier_1',
          offerId: 'offer_1',
          cadence: 'year',
          duration: 1,
          successUrl: 'https://example.com/',
          buyer: {
            memberId: null,
            email: 'buyer@example.com',
            name: null,
            isAuthenticated: false,
          },
        }),
      { context: 'Offers cannot be applied to gift subscriptions' },
    );
    sinon.assert.notCalled(checkoutAdapter.createSession);
  });

  it('deletes the pending gift when Stripe session creation fails', async function () {
    const { service, checkoutAdapter, giftRepository } = createService();
    checkoutAdapter.createSession.rejects(new Error('Stripe unavailable'));

    await assert.rejects(
      () =>
        service.startCheckout({
          tierId: 'tier_1',
          cadence: 'year',
          successUrl: 'https://example.com/',
          buyer: {
            memberId: null,
            email: 'buyer@example.com',
            name: null,
            isAuthenticated: false,
          },
        }),
      /Stripe unavailable/,
    );

    sinon.assert.calledOnceWithExactly(giftRepository.deletePendingCheckout, 'gift_1');
  });

  it('returns a stable continuation decision without exposing the Gift entity', async function () {
    const { service, giftRepository } = createService();
    const gift = buildGift({
      status: 'redeemed',
      tierId: 'tier_1',
      cadence: 'year',
      redeemedAt: new Date(),
      consumesAt: new Date(Date.now() + 900 * 24 * 60 * 60 * 1000),
    });
    giftRepository.getActiveByMember.resolves(gift);

    const result = await service.preparePaidContinuation({
      memberId: 'member_1',
      memberStatus: 'gift',
    });

    assert.deepEqual(result, {
      tierId: 'tier_1',
      cadence: 'year',
      trialDays: 730,
    });
    assert.equal('token' in result, false);
  });

  it('returns the public redemption DTO at the interface', async function () {
    const { service, giftRepository } = createService();
    giftRepository.getByToken.resolves(
      buildGift({
        token: 'gift-token',
        tierId: 'tier_1',
        buyerName: 'Jamie',
        recipientName: 'Taylor',
        personalMessage: 'Enjoy!',
      }),
    );

    const result = await service.getRedeemable({
      token: 'gift-token',
      memberStatus: 'free',
    });

    assert.deepEqual(result, {
      token: 'gift-token',
      cadence: 'year',
      duration: 1,
      currency: 'usd',
      amount: 5000,
      buyer_name: 'Jamie',
      recipient_name: 'Taylor',
      message: 'Enjoy!',
      expires_at: new Date('2030-01-01T00:00:00.000Z'),
      consumes_at: null,
      tier: {
        id: 'tier_1',
        name: 'Gold',
        description: 'All access',
        benefits: ['Everything'],
      },
    });
  });

  it('returns member presentation facts without persistence fields', async function () {
    const { service, giftRepository } = createService();
    giftRepository.getActiveByMembers.resolves(
      new Map([
        [
          'member_1',
          buildGift({
            cadence: 'month',
            currency: 'eur',
            amount: 900,
          }),
        ],
      ]),
    );

    const result = await service.getMemberPresentations(['member_1']);

    assert.deepEqual(result.get('member_1'), {
      cadence: 'month',
      currency: 'eur',
      amount: 900,
    });
  });

  it('exposes gift events through the same module', async function () {
    const { service, giftRepository } = createService();
    const page = {
      data: [
        {
          type: 'gift_purchase_event' as const,
          data: {
            id: 'gift_1',
            member_id: 'member_1',
            tier_name: 'Gold',
            created_at: '2026-07-30T00:00:00.000Z',
          },
        },
      ],
      meta: { pagination: { page: 1 } },
    };
    giftRepository.browsePurchaseEvents.resolves(page);

    const result = await service.browsePurchaseEvents(
      {
        order: 'created_at desc',
      },
      { type: 'unused' },
    );

    assert.deepEqual(result, page);
    sinon.assert.calledOnceWithExactly(
      giftRepository.browsePurchaseEvents,
      { order: 'created_at desc' },
      { type: 'unused' },
    );
  });
});
