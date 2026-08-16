import assert from 'node:assert/strict';
import sinon from 'sinon';
import {GiftService} from '../../../../../core/server/services/gifts/gift-service';
import {buildGift} from './utils';

describe('GiftService interface', function () {
    afterEach(function () {
        sinon.restore();
    });

    function createService({
        customizationEnabled = false,
        portalPlans = ['monthly', 'yearly']
    } = {}) {
        const tier = {
            id: {
                toHexString: () => 'tier_1'
            },
            name: 'Gold',
            status: 'active',
            visibility: 'public',
            type: 'paid',
            currency: 'USD',
            monthlyPrice: 1000,
            yearlyPrice: 12000,
            getPrice: sinon.stub().callsFake((cadence: string) => cadence === 'month' ? 1000 : 12000),
            toJSON: () => ({
                id: 'tier_1',
                name: 'Gold',
                description: 'All access',
                benefits: ['Everything']
            })
        };
        const giftRepository = {
            getByToken: sinon.stub().resolves(null),
            getActiveByMember: sinon.stub().resolves(null),
            getActiveByMembers: sinon.stub().resolves(new Map()),
            browsePurchaseEvents: sinon.stub().resolves({data: [], meta: {pagination: {page: 1}}}),
            browseRedemptionEvents: sinon.stub().resolves({data: [], meta: {pagination: {page: 1}}}),
            transaction: sinon.stub().callsFake(async callback => callback('trx'))
        };
        const checkoutAdapter = {
            getCustomerId: sinon.stub().resolves('cus_123'),
            createSession: sinon.stub().resolves('https://checkout.stripe.test/session')
        };
        const service = new GiftService({
            giftRepository,
            memberRepository: {},
            tiersService: {
                api: {
                    read: sinon.stub().resolves(tier)
                }
            },
            giftEmailService: {},
            staffServiceEmails: {},
            giftReminderScheduler: {},
            checkoutAdapter,
            labsService: {
                isSet: sinon.stub().withArgs('giftSubCustomization').returns(customizationEnabled)
            },
            settingsCache: {
                get: sinon.stub().withArgs('portal_plans').returns(portalPlans)
            }
        } as any);

        return {
            service,
            tier,
            giftRepository,
            checkoutAdapter
        };
    }

    it('owns the complete gift checkout decision', async function () {
        const {service, checkoutAdapter} = createService();

        const result = await service.startCheckout({
            tierId: 'tier_1',
            cadence: 'year',
            duration: 1,
            metadata: {attribution_id: 'post_1'},
            successUrl: 'https://example.com/',
            cancelUrl: 'https://example.com/cancel/',
            buyer: {
                memberId: 'member_1',
                email: 'buyer@example.com',
                name: 'Buyer',
                isAuthenticated: true
            }
        });

        assert.deepEqual(result, {url: 'https://checkout.stripe.test/session'});
        sinon.assert.calledOnceWithExactly(checkoutAdapter.getCustomerId, {
            memberId: 'member_1',
            email: 'buyer@example.com',
            name: 'Buyer',
            isAuthenticated: true
        });

        const plan = checkoutAdapter.createSession.firstCall.firstArg;
        const successUrl = new URL(plan.successUrl);

        assert.equal(plan.amount, 12000);
        assert.equal(plan.currency, 'usd');
        assert.equal(plan.customerId, 'cus_123');
        assert.equal(plan.metadata.ghost_gift, 'true');
        assert.equal(plan.metadata.tier_id, 'tier_1');
        assert.match(plan.metadata.gift_token, /^[A-Za-z0-9]{12}$/);
        assert.equal(successUrl.searchParams.get('stripe'), 'gift-purchase-success');
        assert.equal(successUrl.searchParams.get('gift_token'), plan.metadata.gift_token);
        assert.equal(successUrl.searchParams.get('gift_tier'), 'tier_1');
        assert.equal(successUrl.searchParams.get('gift_cadence'), 'year');
        assert.equal(successUrl.searchParams.get('gift_duration'), null);
    });

    for (const duration of [3, 6]) {
        it(`owns the customized ${duration}-month checkout decision`, async function () {
            const {service, checkoutAdapter} = createService({customizationEnabled: true});

            await service.startCheckout({
                tierId: 'tier_1',
                duration,
                metadata: {},
                successUrl: 'https://example.com/',
                buyer: {
                    memberId: null,
                    email: 'buyer@example.com',
                    name: null,
                    isAuthenticated: false
                }
            });

            const plan = checkoutAdapter.createSession.firstCall.firstArg;
            const successUrl = new URL(plan.successUrl);

            assert.equal(plan.cadence, 'month');
            assert.equal(plan.duration, duration);
            assert.equal(plan.amount, 1000 * duration);
            assert.equal(plan.metadata.duration, String(duration));
            assert.equal(successUrl.searchParams.get('gift_duration'), String(duration));
        });
    }

    it('ignores customized duration input while the flag is disabled', async function () {
        const {service, checkoutAdapter} = createService();

        await service.startCheckout({
            tierId: 'tier_1',
            cadence: 'year',
            duration: 3,
            metadata: {},
            successUrl: 'https://example.com/',
            buyer: {
                memberId: null,
                email: 'buyer@example.com',
                name: null,
                isAuthenticated: false
            }
        });

        const plan = checkoutAdapter.createSession.firstCall.firstArg;
        const successUrl = new URL(plan.successUrl);

        assert.equal(plan.cadence, 'year');
        assert.equal(plan.duration, 1);
        assert.equal(plan.amount, 12000);
        assert.equal(successUrl.searchParams.get('gift_duration'), null);
    });

    it('keeps cadence-only clients compatible while customization is enabled', async function () {
        const {service, checkoutAdapter} = createService({customizationEnabled: true});

        await service.startCheckout({
            tierId: 'tier_1',
            cadence: 'year',
            metadata: {},
            successUrl: 'https://example.com/',
            buyer: {
                memberId: null,
                email: 'buyer@example.com',
                name: null,
                isAuthenticated: false
            }
        });

        const plan = checkoutAdapter.createSession.firstCall.firstArg;
        const successUrl = new URL(plan.successUrl);

        assert.equal(plan.cadence, 'year');
        assert.equal(plan.duration, 1);
        assert.equal(plan.amount, 12000);
        assert.equal(successUrl.searchParams.get('gift_duration'), '12');
    });

    it('enforces the Portal plan gate for explicit customized durations', async function () {
        const {service, checkoutAdapter} = createService({
            customizationEnabled: true,
            portalPlans: ['yearly']
        });

        await assert.rejects(() => service.startCheckout({
            tierId: 'tier_1',
            duration: 3,
            metadata: {},
            successUrl: 'https://example.com/',
            buyer: {
                memberId: null,
                email: 'buyer@example.com',
                name: null,
                isAuthenticated: false
            }
        }), {context: 'The monthly Portal plan is not available'});

        sinon.assert.notCalled(checkoutAdapter.createSession);
    });

    it('rejects unsupported or conflicting customized durations', async function () {
        const {service, checkoutAdapter} = createService({customizationEnabled: true});
        const buyer = {
            memberId: null,
            email: 'buyer@example.com',
            name: null,
            isAuthenticated: false
        };

        await assert.rejects(() => service.startCheckout({
            tierId: 'tier_1',
            duration: 2,
            metadata: {},
            successUrl: 'https://example.com/',
            buyer
        }), {context: 'Unsupported gift duration "2"'});
        await assert.rejects(() => service.startCheckout({
            tierId: 'tier_1',
            cadence: 'year',
            duration: 3,
            metadata: {},
            successUrl: 'https://example.com/',
            buyer
        }), {context: 'Gift duration "3" conflicts with cadence "year"'});

        sinon.assert.notCalled(checkoutAdapter.createSession);
    });

    it('rejects offers before reaching the checkout adapter', async function () {
        const {service, checkoutAdapter} = createService();

        await assert.rejects(
            () => service.startCheckout({
                tierId: 'tier_1',
                offerId: 'offer_1',
                cadence: 'year',
                duration: 1,
                metadata: {},
                successUrl: 'https://example.com/',
                buyer: {
                    memberId: null,
                    email: 'buyer@example.com',
                    name: null,
                    isAuthenticated: false
                }
            }),
            {context: 'Offers cannot be applied to gift subscriptions'}
        );
        sinon.assert.notCalled(checkoutAdapter.createSession);
    });

    it('returns a stable continuation decision without exposing the Gift entity', async function () {
        const {service, giftRepository} = createService();
        const gift = buildGift({
            status: 'redeemed',
            tierId: 'tier_1',
            cadence: 'year',
            redeemedAt: new Date(),
            consumesAt: new Date(Date.now() + (900 * 24 * 60 * 60 * 1000))
        });
        giftRepository.getActiveByMember.resolves(gift);

        const result = await service.preparePaidContinuation({
            memberId: 'member_1',
            memberStatus: 'gift'
        });

        assert.deepEqual(result, {
            tierId: 'tier_1',
            cadence: 'year',
            trialDays: 730
        });
        assert.equal('token' in result, false);
    });

    it('returns the public redemption DTO at the interface', async function () {
        const {service, giftRepository} = createService();
        giftRepository.getByToken.resolves(buildGift({
            token: 'gift-token',
            tierId: 'tier_1'
        }));

        const result = await service.getRedeemable({
            token: 'gift-token',
            memberStatus: 'free'
        });

        assert.deepEqual(result, {
            token: 'gift-token',
            cadence: 'year',
            duration: 1,
            currency: 'usd',
            amount: 5000,
            expires_at: new Date('2030-01-01T00:00:00.000Z'),
            consumes_at: null,
            tier: {
                id: 'tier_1',
                name: 'Gold',
                description: 'All access',
                benefits: ['Everything']
            }
        });
    });

    it('returns member presentation facts without persistence fields', async function () {
        const {service, giftRepository} = createService();
        giftRepository.getActiveByMembers.resolves(new Map([
            ['member_1', buildGift({
                cadence: 'month',
                currency: 'eur',
                amount: 900
            })]
        ]));

        const result = await service.getMemberPresentations(['member_1']);

        assert.deepEqual(result.get('member_1'), {
            cadence: 'month',
            currency: 'eur',
            amount: 900
        });
    });

    it('exposes gift events through the same module', async function () {
        const {service, giftRepository} = createService();
        const page = {
            data: [{
                type: 'gift_purchase_event' as const,
                data: {
                    id: 'gift_1',
                    member_id: 'member_1',
                    tier_name: 'Gold',
                    created_at: '2026-07-30T00:00:00.000Z'
                }
            }],
            meta: {pagination: {page: 1}}
        };
        giftRepository.browsePurchaseEvents.resolves(page);

        const result = await service.browsePurchaseEvents({
            order: 'created_at desc'
        }, {type: 'unused'});

        assert.deepEqual(result, page);
        sinon.assert.calledOnceWithExactly(
            giftRepository.browsePurchaseEvents,
            {order: 'created_at desc'},
            {type: 'unused'}
        );
    });
});
