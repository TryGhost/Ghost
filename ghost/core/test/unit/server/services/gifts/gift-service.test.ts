import assert from 'node:assert/strict';
import sinon from 'sinon';
import {GiftService} from '../../../../../core/server/services/gifts/gift-service';
import {Gift} from '../../../../../core/server/services/gifts/gift';

describe('GiftService', function () {
    let giftRepository: {
        create: sinon.SinonStub;
        existsByCheckoutSessionId: sinon.SinonStub;
    };
    let memberRepository: {
        get: sinon.SinonStub;
    };
    const purchaseData = {
        token: 'abc-123',
        buyerEmail: 'buyer@example.com',
        stripeCustomerId: 'cust_123',
        tierId: 'tier_1',
        cadence: 'year' as const,
        duration: '1',
        currency: 'usd',
        amount: 5000,
        stripeCheckoutSessionId: 'cs_123',
        stripePaymentIntentId: 'pi_456'
    };

    beforeEach(function () {
        giftRepository = {
            create: sinon.stub(),
            existsByCheckoutSessionId: sinon.stub().resolves(false)
        };
        memberRepository = {
            get: sinon.stub().resolves({id: 'member_1'})
        };
    });

    afterEach(function () {
        sinon.restore();
    });

    function createService() {
        return new GiftService({giftRepository: giftRepository as any, memberRepository});
    }

    describe('recordPurchase', function () {
        it('creates a Gift entity and saves it', async function () {
            const service = createService();

            const result = await service.recordPurchase(purchaseData);

            assert.equal(result, true);
            sinon.assert.calledOnce(giftRepository.create);

            const gift = giftRepository.create.getCall(0).args[0];

            assert.ok(gift instanceof Gift);
            assert.equal(gift.token, 'abc-123');
            assert.equal(gift.status, 'purchased');
        });

        it('returns false and skips create for duplicate checkout session', async function () {
            giftRepository.existsByCheckoutSessionId.resolves(true);

            const service = createService();
            const result = await service.recordPurchase(purchaseData);

            assert.equal(result, false);

            sinon.assert.notCalled(giftRepository.create);
        });

        it('resolves member by stripeCustomerId', async function () {
            const service = createService();

            await service.recordPurchase(purchaseData);

            sinon.assert.calledWith(memberRepository.get, {customer_id: 'cust_123'});

            const gift = giftRepository.create.getCall(0).args[0];

            assert.equal(gift.buyerMemberId, 'member_1');
        });

        it('sets buyerMemberId to null when stripeCustomerId is null', async function () {
            const service = createService();

            await service.recordPurchase({...purchaseData, stripeCustomerId: null});

            sinon.assert.notCalled(memberRepository.get);

            const gift = giftRepository.create.getCall(0).args[0];

            assert.equal(gift.buyerMemberId, null);
        });

        it('sets buyerMemberId to null when member not found', async function () {
            memberRepository.get.resolves(null);

            const service = createService();

            await service.recordPurchase(purchaseData);

            const gift = giftRepository.create.getCall(0).args[0];

            assert.equal(gift.buyerMemberId, null);
        });

        it('parses duration from string to number', async function () {
            const service = createService();

            await service.recordPurchase({...purchaseData, duration: '3'});

            const gift = giftRepository.create.getCall(0).args[0];

            assert.equal(gift.duration, 3);
        });

        it('throws ValidationError for invalid duration', async function () {
            const service = createService();

            await assert.rejects(
                () => service.recordPurchase({...purchaseData, duration: 'invalid'}),
                (err: any) => {
                    assert.equal(err.errorType, 'ValidationError');

                    assert.ok(err.message.includes('invalid'));

                    return true;
                }
            );

            sinon.assert.notCalled(giftRepository.create);
        });
    });
});
