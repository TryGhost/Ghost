import assert from 'node:assert/strict';
import errors from '@tryghost/errors';
import sinon from 'sinon';
import {GiftService, type GiftPurchaseData} from '../../../../../core/server/services/gifts/gift-service';
import {Gift} from '../../../../../core/server/services/gifts/gift';
import type {GiftRepository} from '../../../../../core/server/services/gifts/gift-repository';
import {buildGift} from './utils';

describe('GiftService', function () {
    type GiftRepositoryStub = {
        existsByCheckoutSessionId: sinon.SinonStub<[string], Promise<boolean>>;
        getByToken: sinon.SinonStub<Parameters<GiftRepository['getByToken']>, ReturnType<GiftRepository['getByToken']>>;
        getByPaymentIntentId: sinon.SinonStub<[string], Promise<Gift | null>>;
        create: sinon.SinonStub;
        update: sinon.SinonStub;
        transaction: sinon.SinonStub<Parameters<GiftRepository['transaction']>, Promise<unknown>>;
    };

    let giftRepository: GiftRepositoryStub;
    let memberRepository: {
        get: sinon.SinonStub;
        update: sinon.SinonStub;
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
            existsByCheckoutSessionId: sinon.stub<[string], Promise<boolean>>().resolves(false),
            getByToken: sinon.stub<Parameters<GiftRepository['getByToken']>, ReturnType<GiftRepository['getByToken']>>().resolves(null),
            getByPaymentIntentId: sinon.stub<[string], Promise<Gift | null>>().resolves(null),
            create: sinon.stub(),
            update: sinon.stub(),
            transaction: sinon.stub<Parameters<GiftRepository['transaction']>, Promise<unknown>>().callsFake(async (callback) => {
                return await callback('trx');
            })
        };
        memberRepository = {
            get: sinon.stub().resolves({id: 'member_1', get: sinon.stub().returns(null)}),
            update: sinon.stub().resolves(undefined)
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
            staffServiceEmails
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
            assert.equal(emailData.cadence, 'year');
            assert.equal(emailData.duration, 1);
        });

        it('throws when tier is not found', async function () {
            tiersService.api.read.resolves(null);

            const service = createService();

            await assert.rejects(
                () => service.recordPurchase(purchaseData),
                {message: 'Tier not found: tier_1'}
            );

            sinon.assert.notCalled(staffServiceEmails.notifyGiftReceived);
            sinon.assert.notCalled(giftEmailService.sendPurchaseConfirmation);
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

        it('does not fail purchase when buyer confirmation email throws', async function () {
            giftEmailService.sendPurchaseConfirmation.rejects(new Error('SMTP error'));

            const service = createService();

            const result = await service.recordPurchase(purchaseData);

            assert.equal(result, true);
            sinon.assert.calledOnce(giftRepository.create);
        });
    });

    describe('getByToken', function () {
        it('returns the gift when the token exists', async function () {
            const expectedGift = buildGift();

            giftRepository.getByToken.resolves(expectedGift);

            const service = createService();
            const result = await service.getByToken('gift-token');

            sinon.assert.calledOnceWithExactly(giftRepository.getByToken, 'gift-token');
            assert.equal(result, expectedGift);
        });

        it('throws NotFoundError when the token does not exist', async function () {
            giftRepository.getByToken.resolves(null);

            const service = createService();
            await assert.rejects(
                () => service.getByToken('missing-token'),
                (err: any) => {
                    assert.equal(err.errorType, 'NotFoundError');
                    assert.equal(err.message, 'This gift does not exist.');
                    return true;
                }
            );
        });
    });

    describe('getRedeemable', function () {
        it('returns the gift when it exists and is redeemable', async function () {
            const gift = buildGift();
            const service = createService();
            const assertRedeemableStub = sinon.stub(service, 'assertRedeemable').resolves(gift);

            giftRepository.getByToken.resolves(gift);

            const result = await service.getRedeemable('gift-token', 'free');

            sinon.assert.calledOnceWithExactly(giftRepository.getByToken, 'gift-token');
            sinon.assert.calledOnceWithExactly(assertRedeemableStub, gift, 'free');
            assert.equal(result, gift);
        });

        it('throws NotFoundError when the token does not exist', async function () {
            giftRepository.getByToken.resolves(null);

            const service = createService();
            await assert.rejects(
                () => service.getRedeemable('missing-token', 'free'),
                (err: any) => {
                    assert.equal(err.errorType, 'NotFoundError');
                    assert.equal(err.message, 'This gift does not exist.');
                    return true;
                }
            );
        });

        it('passes through redeemability errors unchanged', async function () {
            const gift = buildGift();
            const serviceError = new errors.BadRequestError({message: 'This gift has expired.'});
            const service = createService();
            const assertRedeemableStub = sinon.stub(service, 'assertRedeemable').rejects(serviceError);

            giftRepository.getByToken.resolves(gift);

            await assert.rejects(
                () => service.getRedeemable('gift-token', 'free'),
                serviceError
            );

            sinon.assert.calledOnceWithExactly(assertRedeemableStub, gift, 'free');
        });
    });

    describe('assertRedeemable', function () {
        const testCases = [
            {
                name: 'redeemed gifts',
                overrides: {
                    redeemedAt: new Date('2026-02-01T00:00:00.000Z')
                },
                memberStatus: null,
                message: 'This gift has already been redeemed.'
            },
            {
                name: 'consumed gifts',
                overrides: {
                    consumedAt: new Date('2026-02-01T00:00:00.000Z')
                },
                memberStatus: null,
                message: 'This gift has already been consumed.'
            },
            {
                name: 'expired gifts',
                overrides: {
                    expiredAt: new Date('2026-02-01T00:00:00.000Z')
                },
                memberStatus: null,
                message: 'This gift has expired.'
            },
            {
                name: 'refunded gifts',
                overrides: {
                    refundedAt: new Date('2026-02-01T00:00:00.000Z')
                },
                memberStatus: null,
                message: 'This gift has been refunded.'
            },
            {
                name: 'paid members',
                overrides: {},
                memberStatus: 'paid',
                message: 'You already have an active subscription.'
            }
        ];

        it('returns the gift when it is redeemable', async function () {
            const gift = buildGift();
            const checkRedeemableSpy = sinon.spy(gift, 'checkRedeemable');

            const service = createService();
            const result = await service.assertRedeemable(gift, 'free');

            sinon.assert.calledOnceWithExactly(checkRedeemableSpy, 'free');
            assert.equal(result, gift);
        });

        for (const {name, overrides, memberStatus, message} of testCases) {
            it(`throws BadRequestError for ${name}`, async function () {
                const gift = buildGift(overrides);

                const service = createService();
                await assert.rejects(
                    () => service.assertRedeemable(gift, memberStatus),
                    (err: any) => {
                        assert.equal(err.errorType, 'BadRequestError');
                        assert.equal(err.message, message);
                        return true;
                    }
                );
            });
        }
    });

    describe('redeem', function () {
        it('redeems the gift, saves it, and grants gift access to the member', async function () {
            const gift = buildGift();

            giftRepository.getByToken.resolves(gift);
            memberRepository.get.resolves({
                id: 'member_1',
                get: sinon.stub().withArgs('status').returns('free')
            });

            const service = createService();
            const redeemed = await service.redeem({
                token: 'gift-token',
                memberId: 'member_1'
            });

            sinon.assert.calledOnce(giftRepository.transaction);
            sinon.assert.calledOnceWithExactly(giftRepository.getByToken, 'gift-token', {transacting: 'trx', forUpdate: true});
            sinon.assert.calledOnceWithExactly(memberRepository.get, {id: 'member_1'}, {transacting: 'trx', forUpdate: true});
            sinon.assert.calledOnceWithExactly(memberRepository.update, {
                products: [{
                    id: 'tier_1',
                    expiry_at: redeemed.consumesAt
                }],
                status: 'gift'
            }, {
                id: 'member_1',
                transacting: 'trx'
            });
            sinon.assert.calledOnceWithExactly(giftRepository.update, redeemed, {transacting: 'trx'});
            assert.equal(redeemed.status, 'redeemed');
            assert.equal(redeemed.redeemerMemberId, 'member_1');
            assert.notEqual(redeemed.consumesAt, null);
        });

        it('throws NotFoundError when the member does not exist', async function () {
            memberRepository.get.onFirstCall().resolves(null);

            const service = createService();
            await assert.rejects(
                () => service.redeem({
                    token: 'gift-token',
                    memberId: 'missing-member'
                }),
                (err: any) => {
                    assert.equal(err.errorType, 'NotFoundError');
                    assert.equal(err.message, 'Member not found: missing-member');
                    return true;
                }
            );

            sinon.assert.notCalled(memberRepository.update);
            sinon.assert.notCalled(giftRepository.update);
        });

        it('throws NotFoundError when the gift token does not exist', async function () {
            giftRepository.getByToken.resolves(null);

            const service = createService();
            await assert.rejects(
                () => service.redeem({
                    token: 'missing-token',
                    memberId: 'member_1'
                }),
                (err: any) => {
                    assert.equal(err.errorType, 'NotFoundError');
                    assert.equal(err.message, 'This gift does not exist.');
                    return true;
                }
            );

            sinon.assert.notCalled(memberRepository.update);
            sinon.assert.notCalled(giftRepository.update);
        });

        it('throws BadRequestError when the member is not eligible', async function () {
            giftRepository.getByToken.resolves(buildGift());
            memberRepository.get.resolves({
                id: 'member_1',
                get: sinon.stub().withArgs('status').returns('paid')
            });

            const service = createService();
            await assert.rejects(
                () => service.redeem({
                    token: 'gift-token',
                    memberId: 'member_1'
                }),
                (err: any) => {
                    assert.equal(err.errorType, 'BadRequestError');
                    assert.equal(err.message, 'You already have an active subscription.');
                    return true;
                }
            );

            sinon.assert.notCalled(memberRepository.update);
            sinon.assert.notCalled(giftRepository.update);
        });
    });

    describe('refund', function () {
        it('saves a refunded gift and returns true', async function () {
            const gift = buildGift();

            giftRepository.getByPaymentIntentId.resolves(gift);

            const service = createService();
            const result = await service.refund('pi_456');

            assert.equal(result, true);
            sinon.assert.calledOnce(giftRepository.update);

            const [saved, options] = giftRepository.update.getCall(0).args;

            assert.equal(saved.status, 'refunded');
            assert.ok(saved.refundedAt);
            assert.notEqual(saved, gift);
            assert.deepEqual(options, {transacting: 'trx'});
        });

        it('returns false when no gift matches the payment intent', async function () {
            giftRepository.getByPaymentIntentId.resolves(null);

            const service = createService();
            const result = await service.refund('pi_unknown');

            assert.equal(result, false);
            sinon.assert.notCalled(giftRepository.update);
        });

        it('downgrades the redeemer to free when the gift was redeemed', async function () {
            const gift = buildGift({
                status: 'redeemed',
                redeemerMemberId: 'redeemer_1',
                redeemedAt: new Date('2026-02-01T00:00:00.000Z'),
                consumesAt: new Date('2027-02-01T00:00:00.000Z')
            });

            giftRepository.getByPaymentIntentId.resolves(gift);

            const service = createService();
            const result = await service.refund('pi_456');

            assert.equal(result, true);
            sinon.assert.calledOnce(giftRepository.update);
            sinon.assert.calledOnce(giftRepository.transaction);
            sinon.assert.calledOnceWithExactly(memberRepository.update, {
                products: [],
                status: 'free'
            }, {id: 'redeemer_1', transacting: 'trx'});
        });

        it('does not downgrade when the gift was not redeemed', async function () {
            const gift = buildGift();

            giftRepository.getByPaymentIntentId.resolves(gift);

            const service = createService();
            await service.refund('pi_456');

            sinon.assert.notCalled(memberRepository.update);
        });

        it('throws when member downgrade fails', async function () {
            const gift = buildGift({
                status: 'redeemed',
                redeemerMemberId: 'redeemer_1',
                redeemedAt: new Date('2026-02-01T00:00:00.000Z'),
                consumesAt: new Date('2027-02-01T00:00:00.000Z')
            });

            giftRepository.getByPaymentIntentId.resolves(gift);
            memberRepository.update.rejects(new Error('Cannot remove product with active subscription'));

            const service = createService();
            await assert.rejects(
                () => service.refund('pi_456'),
                {message: 'Cannot remove product with active subscription'}
            );

            assert.equal(gift.status, 'redeemed');
        });

        it('returns true without saving when gift is already refunded', async function () {
            const gift = buildGift({
                status: 'refunded',
                refundedAt: new Date('2026-02-01T00:00:00.000Z')
            });

            giftRepository.getByPaymentIntentId.resolves(gift);

            const service = createService();
            const result = await service.refund('pi_456');

            assert.equal(result, true);
            sinon.assert.notCalled(giftRepository.update);
        });
    });
});
