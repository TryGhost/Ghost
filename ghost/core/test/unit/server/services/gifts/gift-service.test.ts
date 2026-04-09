import assert from 'node:assert/strict';
import sinon from 'sinon';
import {GiftService, type GiftPurchaseData} from '../../../../../core/server/services/gifts/gift-service';
import {Gift} from '../../../../../core/server/services/gifts/gift';
import type {GiftRepository} from '../../../../../core/server/services/gifts/gift-repository';

describe('GiftService', function () {
    let giftRepository: sinon.SinonStubbedInstance<GiftRepository>;
    let memberRepository: {
        get: sinon.SinonStub;
    };
    let staffServiceEmails: {
        notifyGiftReceived: sinon.SinonStub;
    };
    let giftEmailService: {
        sendPurchaseConfirmation: sinon.SinonStub;
    };
    let tiersService: {
        api: {
            read: sinon.SinonStub;
        };
    };
    let labsService: {
        isSet: sinon.SinonStub;
    };
    const purchaseData: GiftPurchaseData = {
        token: 'abc-123',
        buyerEmail: 'buyer@example.com',
        stripeCustomerId: 'cust_123',
        tierId: 'tier_1',
        cadence: 'year',
        duration: '1',
        currency: 'usd',
        amount: 5000,
        stripeCheckoutSessionId: 'cs_123',
        stripePaymentIntentId: 'pi_456'
    };

    beforeEach(function () {
        giftRepository = {
            create: sinon.stub(),
            existsByCheckoutSessionId: sinon.stub<[string], Promise<boolean>>().resolves(false),
            getByToken: sinon.stub<[string], Promise<Gift | null>>().resolves(null)
        };
        memberRepository = {
            get: sinon.stub().resolves({id: 'member_1', get: sinon.stub().returns(null)})
        };
        staffServiceEmails = {
            notifyGiftReceived: sinon.stub()
        };
        giftEmailService = {
            sendPurchaseConfirmation: sinon.stub()
        };
        tiersService = {
            api: {
                read: sinon.stub().resolves({
                    id: 'tier_1',
                    name: 'Bronze',
                    description: 'Tier description',
                    benefits: ['Benefit 1', 'Benefit 2']
                })
            }
        };
        labsService = {
            isSet: sinon.stub().returns(true)
        };
    });

    afterEach(function () {
        sinon.restore();
    });

    function createService() {
        return new GiftService({
            giftRepository: giftRepository as any,
            memberRepository,
            tiersService,
            giftEmailService,
            staffServiceEmails,
            labsService
        });
    }

    function buildGift(overrides: Partial<ConstructorParameters<typeof Gift>[0]> = {}) {
        return new Gift({
            token: 'gift-token',
            buyerEmail: 'buyer@example.com',
            buyerMemberId: 'buyer_member_1',
            redeemerMemberId: null,
            tierId: 'tier_1',
            cadence: 'year',
            duration: 1,
            currency: 'usd',
            amount: 5000,
            stripeCheckoutSessionId: 'cs_123',
            stripePaymentIntentId: 'pi_456',
            consumesAt: null,
            expiresAt: new Date('2030-01-01T00:00:00.000Z'),
            status: 'purchased',
            purchasedAt: new Date('2026-01-01T00:00:00.000Z'),
            redeemedAt: null,
            consumedAt: null,
            expiredAt: null,
            refundedAt: null,
            ...overrides
        });
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
            const memberGet = sinon.stub();

            memberGet.withArgs('name').returns('Member Name');
            memberGet.withArgs('email').returns('member@example.com');

            memberRepository.get.resolves({id: 'member_1', get: memberGet});

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

        it('sends staff notification email after recording purchase', async function () {
            const memberGet = sinon.stub();

            memberGet.withArgs('name').returns('Member Name');
            memberGet.withArgs('email').returns('member@example.com');

            memberRepository.get.resolves({id: 'member_1', get: memberGet});

            const service = createService();

            await service.recordPurchase(purchaseData);

            sinon.assert.calledOnce(staffServiceEmails.notifyGiftReceived);

            const emailData = staffServiceEmails.notifyGiftReceived.getCall(0).args[0];

            assert.equal(emailData.name, 'Member Name');
            assert.equal(emailData.email, 'member@example.com');
            assert.equal(emailData.memberId, 'member_1');
            assert.equal(emailData.amount, 5000);
            assert.equal(emailData.currency, 'usd');
            assert.equal(emailData.tierName, 'Bronze');
            assert.equal(emailData.cadenceLabel, '1 year');
        });

        it('formats cadenceLabel with pluralized unit when duration is greater than 1', async function () {
            const service = createService();

            await service.recordPurchase({...purchaseData, duration: '3', cadence: 'month'});

            const emailData = staffServiceEmails.notifyGiftReceived.getCall(0).args[0];

            assert.equal(emailData.cadenceLabel, '3 months');
        });

        it('passes a null tierName to staff notification when tier load fails', async function () {
            tiersService.api.read.resolves(null);

            const service = createService();

            await service.recordPurchase(purchaseData);

            sinon.assert.calledOnce(staffServiceEmails.notifyGiftReceived);

            const emailData = staffServiceEmails.notifyGiftReceived.getCall(0).args[0];

            assert.equal(emailData.tierName, null);
            assert.equal(emailData.cadenceLabel, '1 year');
        });

        it('uses buyerEmail and null name when buyer is not a member', async function () {
            const service = createService();

            await service.recordPurchase({...purchaseData, stripeCustomerId: null});

            sinon.assert.calledOnce(staffServiceEmails.notifyGiftReceived);

            const emailData = staffServiceEmails.notifyGiftReceived.getCall(0).args[0];

            assert.equal(emailData.name, null);
            assert.equal(emailData.email, 'buyer@example.com');
            assert.equal(emailData.memberId, null);
        });

        it('sends buyer confirmation email', async function () {
            const service = createService();

            await service.recordPurchase(purchaseData);

            sinon.assert.calledOnce(tiersService.api.read);
            sinon.assert.calledWith(tiersService.api.read, 'tier_1');
            sinon.assert.calledOnce(giftEmailService.sendPurchaseConfirmation);

            const emailData = giftEmailService.sendPurchaseConfirmation.getCall(0).args[0];

            assert.equal(emailData.buyerEmail, 'buyer@example.com');
            assert.equal(emailData.amount, 5000);
            assert.equal(emailData.currency, 'usd');
            assert.equal(emailData.token, 'abc-123');
            assert.equal(emailData.tierName, 'Bronze');
            assert.equal(emailData.cadence, 'year');
            assert.equal(emailData.duration, 1);
            assert.ok(emailData.expiresAt instanceof Date);
        });

        it('does not send confirmation email when tier is not found', async function () {
            tiersService.api.read.resolves(null);

            const service = createService();

            const result = await service.recordPurchase(purchaseData);

            assert.equal(result, true);
            sinon.assert.notCalled(giftEmailService.sendPurchaseConfirmation);
        });

        it('does not fail purchase when buyer confirmation email throws', async function () {
            giftEmailService.sendPurchaseConfirmation.rejects(new Error('SMTP error'));

            const service = createService();

            const result = await service.recordPurchase(purchaseData);

            assert.equal(result, true);
            sinon.assert.calledOnce(giftRepository.create);
        });
    });

    describe('getRedeemableGiftByToken', function () {
        it('returns gift details for an anonymous visitor', async function () {
            giftRepository.getByToken.resolves(buildGift());

            const service = createService();
            const gift = await service.getRedeemableGiftByToken({token: 'gift-token'});

            sinon.assert.calledOnceWithExactly(giftRepository.getByToken, 'gift-token');
            sinon.assert.calledOnceWithExactly(tiersService.api.read, 'tier_1');
            assert.deepEqual(gift, {
                token: 'gift-token',
                cadence: 'year',
                duration: 1,
                currency: 'usd',
                amount: 5000,
                expires_at: new Date('2030-01-01T00:00:00.000Z'),
                tier: {
                    id: 'tier_1',
                    name: 'Bronze',
                    description: 'Tier description',
                    benefits: ['Benefit 1', 'Benefit 2']
                }
            });
        });

        it('returns gift details for a logged-in free member', async function () {
            giftRepository.getByToken.resolves(buildGift());

            const service = createService();
            const gift = await service.getRedeemableGiftByToken({
                token: 'gift-token',
                currentMember: {
                    status: 'free'
                }
            });

            assert.equal(gift.token, 'gift-token');
        });

        it('throws NotFoundError when the token does not exist', async function () {
            const service = createService();

            await assert.rejects(
                () => service.getRedeemableGiftByToken({token: 'missing-token'}),
                (err: any) => {
                    assert.equal(err.errorType, 'NotFoundError');
                    assert.equal(err.message, 'Gift not found.');
                    return true;
                }
            );
        });

        it('throws BadRequestError when the gift has already been redeemed', async function () {
            giftRepository.getByToken.resolves(buildGift({
                redeemedAt: new Date('2026-02-01T00:00:00.000Z')
            }));

            const service = createService();

            await assert.rejects(
                () => service.getRedeemableGiftByToken({token: 'gift-token'}),
                (err: any) => {
                    assert.equal(err.errorType, 'BadRequestError');
                    assert.equal(err.message, 'This gift has already been redeemed.');
                    return true;
                }
            );
        });

        it('throws BadRequestError when the gift has already been consumed', async function () {
            giftRepository.getByToken.resolves(buildGift({
                consumedAt: new Date('2026-02-01T00:00:00.000Z')
            }));

            const service = createService();

            await assert.rejects(
                () => service.getRedeemableGiftByToken({token: 'gift-token'}),
                (err: any) => {
                    assert.equal(err.errorType, 'BadRequestError');
                    assert.equal(err.message, 'This gift has already been consumed.');
                    return true;
                }
            );

            sinon.assert.notCalled(tiersService.api.read);
        });

        it('throws BadRequestError when the gift has expired', async function () {
            giftRepository.getByToken.resolves(buildGift({
                expiredAt: new Date('2026-02-01T00:00:00.000Z')
            }));

            const service = createService();

            await assert.rejects(
                () => service.getRedeemableGiftByToken({token: 'gift-token'}),
                (err: any) => {
                    assert.equal(err.errorType, 'BadRequestError');
                    assert.equal(err.message, 'This gift has expired.');
                    return true;
                }
            );
        });

        it('throws BadRequestError when the gift has been refunded', async function () {
            giftRepository.getByToken.resolves(buildGift({
                refundedAt: new Date('2026-02-01T00:00:00.000Z')
            }));

            const service = createService();

            await assert.rejects(
                () => service.getRedeemableGiftByToken({token: 'gift-token'}),
                (err: any) => {
                    assert.equal(err.errorType, 'BadRequestError');
                    assert.equal(err.message, 'This gift has been refunded.');
                    return true;
                }
            );

            sinon.assert.notCalled(tiersService.api.read);
        });

        it('throws BadRequestError for a logged-in paid member', async function () {
            giftRepository.getByToken.resolves(buildGift());

            const service = createService();

            await assert.rejects(
                () => service.getRedeemableGiftByToken({
                    token: 'gift-token',
                    currentMember: {
                        status: 'paid'
                    }
                }),
                (err: any) => {
                    assert.equal(err.errorType, 'BadRequestError');
                    assert.equal(err.message, 'You already have an active subscription.');
                    return true;
                }
            );
        });

        it('throws BadRequestError for a logged-in comped member', async function () {
            giftRepository.getByToken.resolves(buildGift());

            const service = createService();

            await assert.rejects(
                () => service.getRedeemableGiftByToken({
                    token: 'gift-token',
                    currentMember: {
                        status: 'comped'
                    }
                }),
                (err: any) => {
                    assert.equal(err.errorType, 'BadRequestError');
                    assert.equal(err.message, 'You already have an active subscription.');
                    return true;
                }
            );
        });

        it('throws BadRequestError when the labs flag is disabled', async function () {
            labsService.isSet.returns(false);

            const service = createService();

            await assert.rejects(
                () => service.getRedeemableGiftByToken({token: 'gift-token'}),
                (err: any) => {
                    assert.equal(err.errorType, 'BadRequestError');
                    assert.equal(err.message, 'Gift subscriptions are not enabled on this site.');
                    return true;
                }
            );

            sinon.assert.notCalled(giftRepository.getByToken);
        });

        it('throws NotFoundError when the tier cannot be loaded', async function () {
            giftRepository.getByToken.resolves(buildGift());
            tiersService.api.read.resolves(null);

            const service = createService();

            await assert.rejects(
                () => service.getRedeemableGiftByToken({token: 'gift-token'}),
                (err: any) => {
                    assert.equal(err.errorType, 'NotFoundError');
                    assert.equal(err.message, 'Gift not found.');
                    return true;
                }
            );
        });
    });
});
