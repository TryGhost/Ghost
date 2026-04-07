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
    let staffServiceEmails: {
        notifyGiftReceived: sinon.SinonStub;
    };
    const purchaseData = {
        token: 'abc-123',
        buyerEmail: 'buyer@example.com',
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
            get: sinon.stub()
        };
        staffServiceEmails = {
            notifyGiftReceived: sinon.stub()
        };
    });

    afterEach(function () {
        sinon.restore();
    });

    function createService() {
        return new GiftService({giftRepository: giftRepository as any, memberRepository, staffServiceEmails});
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

        it('resolves member by buyerEmail', async function () {
            memberRepository.get.withArgs({email: 'buyer@example.com'}).resolves({id: 'member_1', get: sinon.stub().returns(null)});

            const service = createService();

            await service.recordPurchase(purchaseData);

            sinon.assert.calledWith(memberRepository.get, {email: 'buyer@example.com'});

            const gift = giftRepository.create.getCall(0).args[0];

            assert.equal(gift.buyerMemberId, 'member_1');
        });

        it('sets buyerMemberId to null when member not found', async function () {
            memberRepository.get.withArgs({email: 'buyer@example.com'}).resolves(null);

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

        it('sends staff notification email after recording purchase', async function () {
            const memberGet = sinon.stub();

            memberGet.withArgs('name').returns('Alice');
            memberGet.withArgs('email').returns('buyer@example.com');

            memberRepository.get.withArgs({email: 'buyer@example.com'}).resolves({id: 'member_1', get: memberGet});

            const service = createService();

            await service.recordPurchase(purchaseData);

            sinon.assert.calledOnce(staffServiceEmails.notifyGiftReceived);

            const emailData = staffServiceEmails.notifyGiftReceived.getCall(0).args[0];

            assert.equal(emailData.name, 'Alice');
            assert.equal(emailData.email, 'buyer@example.com');
            assert.equal(emailData.memberId, 'member_1');
            assert.equal(emailData.amount, 5000);
            assert.equal(emailData.currency, 'usd');
        });

        it('uses buyerEmail and null name when purchaser is not a member', async function () {
            memberRepository.get.withArgs({email: 'buyer@example.com'}).resolves(null);

            const service = createService();

            await service.recordPurchase(purchaseData);

            sinon.assert.calledOnce(staffServiceEmails.notifyGiftReceived);

            const emailData = staffServiceEmails.notifyGiftReceived.getCall(0).args[0];

            assert.equal(emailData.name, null);
            assert.equal(emailData.email, 'buyer@example.com');
            assert.equal(emailData.memberId, null);
        });
    });
});
