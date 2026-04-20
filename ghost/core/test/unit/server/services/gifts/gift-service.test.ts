import assert from 'node:assert/strict';
import errors from '@tryghost/errors';
import sinon from 'sinon';
import {GiftService, type GiftPurchaseData} from '../../../../../core/server/services/gifts/gift-service';
import {Gift} from '../../../../../core/server/services/gifts/gift';
import type {FindPendingReminderOptions, GiftRepository} from '../../../../../core/server/services/gifts/gift-repository';
import {buildGift} from './utils';

function buildRedeemedGift(overrides: Parameters<typeof buildGift>[0] = {}) {
    return buildGift({
        token: 'gift-token',
        status: 'redeemed',
        redeemerMemberId: 'member_1',
        redeemedAt: new Date('2025-04-01T00:00:00.000Z'),
        consumesAt: new Date('2026-04-16T00:00:00.000Z'),
        ...overrides
    });
}

function buildRedeemer(id: string = 'member_1') {
    const memberGet = sinon.stub();

    memberGet.withArgs('email').returns(`${id}@example.com`);
    memberGet.withArgs('name').returns('Member Name');
    memberGet.withArgs('email_disabled').returns(false);

    return {id, get: memberGet};
}

describe('GiftService', function () {
    type GiftRepositoryStub = {
        existsByCheckoutSessionId: sinon.SinonStub<[string], Promise<boolean>>;
        getByToken: sinon.SinonStub<Parameters<GiftRepository['getByToken']>, ReturnType<GiftRepository['getByToken']>>;
        getByPaymentIntentId: sinon.SinonStub<[string], Promise<Gift | null>>;
        findPendingConsumption: sinon.SinonStub<[], Promise<Gift[]>>;
        findPendingExpiration: sinon.SinonStub<[], Promise<Gift[]>>;
        findPendingReminder: sinon.SinonStub<[FindPendingReminderOptions], Promise<Gift[]>>;
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
        notifyGiftSubscriptionStarted: sinon.SinonStub;
    };
    let giftEmailService: {
        sendPurchaseConfirmation: sinon.SinonStub;
        sendReminder: sinon.SinonStub;
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
            findPendingConsumption: sinon.stub<[], Promise<Gift[]>>().resolves([]),
            findPendingExpiration: sinon.stub<[], Promise<Gift[]>>().resolves([]),
            findPendingReminder: sinon.stub<[FindPendingReminderOptions], Promise<Gift[]>>().resolves([]),
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
            notifyGiftReceived: sinon.stub(),
            notifyGiftSubscriptionStarted: sinon.stub()
        };
        giftEmailService = {
            sendPurchaseConfirmation: sinon.stub().resolves(undefined),
            sendReminder: sinon.stub().resolves(undefined)
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

        it('returns null when the token does not exist', async function () {
            giftRepository.getByToken.resolves(null);

            const service = createService();
            const result = await service.getByToken('missing-token');

            sinon.assert.calledOnceWithExactly(giftRepository.getByToken, 'missing-token');
            assert.equal(result, null);
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

    describe('processConsumed', function () {
        it('returns zero counts when no gifts are pending consumption', async function () {
            giftRepository.findPendingConsumption.resolves([]);

            const service = createService();
            const result = await service.processConsumed();

            assert.deepEqual(result, {consumedCount: 0, updatedMemberCount: 0});
            sinon.assert.notCalled(memberRepository.get);
            sinon.assert.notCalled(memberRepository.update);
            sinon.assert.notCalled(giftRepository.update);
        });

        it('downgrades gift members and marks gifts as consumed', async function () {
            const gift = buildGift({
                status: 'redeemed',
                redeemerMemberId: 'member_1',
                redeemedAt: new Date('2025-04-01T00:00:00.000Z'),
                consumesAt: new Date('2026-04-01T00:00:00.000Z')
            });

            giftRepository.findPendingConsumption.resolves([gift]);
            giftRepository.getByToken.resolves(gift);
            memberRepository.get.resolves({
                id: 'member_1',
                get: sinon.stub().withArgs('status').returns('gift')
            });

            const service = createService();
            const result = await service.processConsumed();

            assert.equal(result.consumedCount, 1);
            assert.equal(result.updatedMemberCount, 1);

            sinon.assert.calledOnce(giftRepository.transaction);
            sinon.assert.calledOnceWithExactly(giftRepository.getByToken, gift.token, {transacting: 'trx', forUpdate: true});
            sinon.assert.calledOnceWithExactly(memberRepository.update, {
                products: [],
                status: 'free'
            }, {id: 'member_1', transacting: 'trx'});

            sinon.assert.calledOnce(giftRepository.update);
            const savedGift = giftRepository.update.getCall(0).args[0];
            assert.equal(savedGift.status, 'consumed');
            assert.notEqual(savedGift.consumedAt, null);
        });

        it('skips gifts that are no longer redeemed when re-loaded', async function () {
            const gift = buildGift({
                status: 'redeemed',
                redeemerMemberId: 'member_1',
                redeemedAt: new Date('2025-04-01T00:00:00.000Z'),
                consumesAt: new Date('2026-04-01T00:00:00.000Z')
            });

            giftRepository.findPendingConsumption.resolves([gift]);
            giftRepository.getByToken.resolves(buildGift({
                status: 'refunded',
                refundedAt: new Date()
            }));

            const service = createService();
            const result = await service.processConsumed();

            assert.equal(result.consumedCount, 0);
            assert.equal(result.updatedMemberCount, 0);
            sinon.assert.notCalled(giftRepository.update);
            sinon.assert.notCalled(memberRepository.get);
        });

        it('skips members that are no longer in gift status', async function () {
            const gift = buildGift({
                status: 'redeemed',
                redeemerMemberId: 'member_1',
                redeemedAt: new Date('2025-04-01T00:00:00.000Z'),
                consumesAt: new Date('2026-04-01T00:00:00.000Z')
            });

            giftRepository.findPendingConsumption.resolves([gift]);
            giftRepository.getByToken.resolves(gift);
            memberRepository.get.resolves({
                id: 'member_1',
                get: sinon.stub().withArgs('status').returns('paid')
            });

            const service = createService();
            const result = await service.processConsumed();

            assert.equal(result.consumedCount, 1);
            assert.equal(result.updatedMemberCount, 0);
            sinon.assert.notCalled(memberRepository.update);
            // Gift should still be marked consumed
            sinon.assert.calledOnce(giftRepository.update);
        });

        it('skips members that no longer exist', async function () {
            const gift = buildGift({
                status: 'redeemed',
                redeemerMemberId: 'member_1',
                redeemedAt: new Date('2025-04-01T00:00:00.000Z'),
                consumesAt: new Date('2026-04-01T00:00:00.000Z')
            });

            giftRepository.findPendingConsumption.resolves([gift]);
            giftRepository.getByToken.resolves(gift);
            memberRepository.get.resolves(null);

            const service = createService();
            const result = await service.processConsumed();

            assert.equal(result.consumedCount, 1);
            assert.equal(result.updatedMemberCount, 0);
            sinon.assert.notCalled(memberRepository.update);
        });

        it('handles multiple gifts for different members', async function () {
            const gift1 = buildGift({
                token: 'gift-1',
                status: 'redeemed',
                redeemerMemberId: 'member_1',
                redeemedAt: new Date('2025-04-01T00:00:00.000Z'),
                consumesAt: new Date('2026-04-01T00:00:00.000Z')
            });
            const gift2 = buildGift({
                token: 'gift-2',
                status: 'redeemed',
                redeemerMemberId: 'member_2',
                redeemedAt: new Date('2025-06-01T00:00:00.000Z'),
                consumesAt: new Date('2026-06-01T00:00:00.000Z')
            });

            giftRepository.findPendingConsumption.resolves([gift1, gift2]);
            giftRepository.getByToken
                .withArgs('gift-1', {transacting: 'trx', forUpdate: true}).resolves(gift1)
                .withArgs('gift-2', {transacting: 'trx', forUpdate: true}).resolves(gift2);
            memberRepository.get
                .withArgs({id: 'member_1'}, {transacting: 'trx', forUpdate: true}).resolves({
                    id: 'member_1',
                    get: sinon.stub().withArgs('status').returns('gift')
                })
                .withArgs({id: 'member_2'}, {transacting: 'trx', forUpdate: true}).resolves({
                    id: 'member_2',
                    get: sinon.stub().withArgs('status').returns('gift')
                });

            const service = createService();
            const result = await service.processConsumed();

            assert.equal(result.consumedCount, 2);
            assert.equal(result.updatedMemberCount, 2);
            assert.equal(memberRepository.update.callCount, 2);
            assert.equal(giftRepository.update.callCount, 2);
        });
    });

    describe('processExpired', function () {
        it('returns zero count when no gifts are pending expiration', async function () {
            giftRepository.findPendingExpiration.resolves([]);

            const service = createService();
            const result = await service.processExpired();

            assert.deepEqual(result, {expiredCount: 0});
            sinon.assert.notCalled(giftRepository.update);
        });

        it('marks purchased gifts past their expiry as expired', async function () {
            const gift = buildGift({
                status: 'purchased',
                expiresAt: new Date('2026-01-01T00:00:00.000Z')
            });

            giftRepository.findPendingExpiration.resolves([gift]);
            giftRepository.getByToken.resolves(gift);

            const service = createService();
            const result = await service.processExpired();

            assert.equal(result.expiredCount, 1);

            sinon.assert.calledOnce(giftRepository.transaction);
            sinon.assert.calledOnceWithExactly(giftRepository.getByToken, gift.token, {transacting: 'trx', forUpdate: true});

            sinon.assert.calledOnce(giftRepository.update);
            const savedGift = giftRepository.update.getCall(0).args[0];
            assert.equal(savedGift.status, 'expired');
            assert.notEqual(savedGift.expiredAt, null);
        });

        it('skips gifts that are no longer purchased when re-loaded', async function () {
            const gift = buildGift({
                status: 'purchased',
                expiresAt: new Date('2026-01-01T00:00:00.000Z')
            });

            giftRepository.findPendingExpiration.resolves([gift]);
            giftRepository.getByToken.resolves(buildGift({
                status: 'redeemed',
                redeemedAt: new Date(),
                redeemerMemberId: 'member_1',
                consumesAt: new Date('2027-01-01T00:00:00.000Z')
            }));

            const service = createService();
            const result = await service.processExpired();

            assert.equal(result.expiredCount, 0);
            sinon.assert.notCalled(giftRepository.update);
        });

        it('handles multiple expired gifts', async function () {
            const gift1 = buildGift({
                token: 'gift-1',
                status: 'purchased',
                expiresAt: new Date('2025-06-01T00:00:00.000Z')
            });
            const gift2 = buildGift({
                token: 'gift-2',
                status: 'purchased',
                expiresAt: new Date('2025-12-01T00:00:00.000Z')
            });

            giftRepository.findPendingExpiration.resolves([gift1, gift2]);
            giftRepository.getByToken
                .withArgs('gift-1', {transacting: 'trx', forUpdate: true}).resolves(gift1)
                .withArgs('gift-2', {transacting: 'trx', forUpdate: true}).resolves(gift2);

            const service = createService();
            const result = await service.processExpired();

            assert.equal(result.expiredCount, 2);
            assert.equal(giftRepository.update.callCount, 2);
        });
    });

    describe('processReminders', function () {
        const MS_PER_DAY = 24 * 60 * 60 * 1000;

        it('returns zero counts when no gifts are pending reminders', async function () {
            giftRepository.findPendingReminder.resolves([]);

            const service = createService();
            const result = await service.processReminders();

            assert.deepEqual(result, {remindedCount: 0, skippedCount: 0, failedCount: 0});
            sinon.assert.notCalled(giftEmailService.sendReminder);
            sinon.assert.notCalled(giftRepository.update);
        });

        it('queries the repository with the 7d/3d window', async function () {
            giftRepository.findPendingReminder.resolves([]);

            const before = Date.now();
            const service = createService();
            await service.processReminders();
            const after = Date.now();

            sinon.assert.calledOnce(giftRepository.findPendingReminder);

            const args = giftRepository.findPendingReminder.getCall(0).args[0];

            assert.equal(args.reminderLeadMs, 7 * MS_PER_DAY);
            assert.equal(args.reminderFloorMs, 3 * MS_PER_DAY);
            assert.ok(args.now.getTime() >= before);
            assert.ok(args.now.getTime() <= after);
        });

        it('sends the reminder, marks the gift as reminded, and returns counts', async function () {
            const gift = buildRedeemedGift();

            giftRepository.findPendingReminder.resolves([gift]);
            giftRepository.getByToken.resolves(gift);
            memberRepository.get.resolves(buildRedeemer());

            const service = createService();
            const result = await service.processReminders();

            assert.equal(result.remindedCount, 1);
            assert.equal(result.skippedCount, 0);
            assert.equal(result.failedCount, 0);

            sinon.assert.calledOnce(giftRepository.transaction);

            // getByToken is called twice: once unlocked (before the tier check) and
            // once locked (inside the transaction).
            assert.equal(giftRepository.getByToken.callCount, 2);
            sinon.assert.calledWithExactly(giftRepository.getByToken.firstCall, gift.token);
            sinon.assert.calledWithExactly(giftRepository.getByToken.secondCall, gift.token, {transacting: 'trx', forUpdate: true});

            sinon.assert.calledOnceWithExactly(memberRepository.get, {id: 'member_1'}, {transacting: 'trx', forUpdate: true});

            sinon.assert.calledOnce(giftEmailService.sendReminder);

            const emailArgs = giftEmailService.sendReminder.getCall(0).args[0];

            assert.equal(emailArgs.memberEmail, 'member_1@example.com');
            assert.equal(emailArgs.memberName, 'Member Name');
            assert.equal(emailArgs.tierName, 'Bronze');
            assert.equal(emailArgs.cadence, gift.cadence);
            assert.equal(emailArgs.duration, gift.duration);
            assert.equal(emailArgs.consumesAt, gift.consumesAt);

            sinon.assert.calledOnce(giftRepository.update);

            const savedGift = giftRepository.update.getCall(0).args[0];

            assert.notEqual(savedGift.consumesSoonReminderSentAt, null);
        });

        it('skips gifts no longer in redeemed status when re-loaded', async function () {
            const gift = buildRedeemedGift();

            giftRepository.findPendingReminder.resolves([gift]);
            giftRepository.getByToken.resolves(buildGift({
                status: 'refunded',
                refundedAt: new Date()
            }));

            const service = createService();
            const result = await service.processReminders();

            assert.equal(result.remindedCount, 0);
            assert.equal(result.skippedCount, 1);
            sinon.assert.notCalled(giftEmailService.sendReminder);
            sinon.assert.notCalled(giftRepository.update);
        });

        it('skips gifts that have already been reminded', async function () {
            const gift = buildRedeemedGift({
                consumesSoonReminderSentAt: new Date('2026-04-10T00:00:00.000Z')
            });

            giftRepository.findPendingReminder.resolves([gift]);
            giftRepository.getByToken.resolves(gift);

            const service = createService();
            const result = await service.processReminders();

            assert.equal(result.remindedCount, 0);
            assert.equal(result.skippedCount, 1);
            sinon.assert.notCalled(giftEmailService.sendReminder);
            sinon.assert.notCalled(giftRepository.update);
        });

        it('marks the gift as reminded but does not send when the redeemer has email_disabled', async function () {
            const gift = buildRedeemedGift();
            const memberGet = sinon.stub();

            memberGet.withArgs('email').returns('member@example.com');
            memberGet.withArgs('name').returns('Member Name');
            memberGet.withArgs('email_disabled').returns(true);

            giftRepository.findPendingReminder.resolves([gift]);
            giftRepository.getByToken.resolves(gift);
            memberRepository.get.resolves({id: 'member_1', get: memberGet});

            const service = createService();
            const result = await service.processReminders();

            assert.equal(result.remindedCount, 0);
            assert.equal(result.skippedCount, 1);
            sinon.assert.notCalled(giftEmailService.sendReminder);
            sinon.assert.calledOnce(giftRepository.update);

            const savedGift = giftRepository.update.getCall(0).args[0];

            assert.notEqual(savedGift.consumesSoonReminderSentAt, null);
        });

        it('marks the gift as reminded but does not send when the redeemer no longer exists', async function () {
            const gift = buildRedeemedGift();

            giftRepository.findPendingReminder.resolves([gift]);
            giftRepository.getByToken.resolves(gift);
            memberRepository.get.resolves(null);

            const service = createService();
            const result = await service.processReminders();

            assert.equal(result.remindedCount, 0);
            assert.equal(result.skippedCount, 1);
            sinon.assert.notCalled(giftEmailService.sendReminder);
            sinon.assert.calledOnce(giftRepository.update);

            const savedGift = giftRepository.update.getCall(0).args[0];

            assert.notEqual(savedGift.consumesSoonReminderSentAt, null);
        });

        it('marks the gift as reminded before sending so a failed email does not cause a duplicate send on retry', async function () {
            // Mark-before-send trade: we accept the risk of a missed reminder on
            // email failure in exchange for the guarantee that no gift is ever
            // reminded twice. The failure is caught by processReminders'
            // per-gift try/catch and counted as a failure rather than propagated.
            const gift = buildRedeemedGift();

            giftRepository.findPendingReminder.resolves([gift]);
            giftRepository.getByToken.resolves(gift);
            memberRepository.get.resolves(buildRedeemer());
            giftEmailService.sendReminder.rejects(new Error('SMTP error'));

            const service = createService();
            const result = await service.processReminders();

            assert.equal(result.remindedCount, 0);
            assert.equal(result.skippedCount, 0);
            assert.equal(result.failedCount, 1);

            // The reminder-sent marker was committed before the email was attempted.
            sinon.assert.calledOnce(giftRepository.update);

            const marked = giftRepository.update.getCall(0).args[0];
            assert.notEqual(marked.consumesSoonReminderSentAt, null);

            // And the update call finished before sendReminder was invoked.
            sinon.assert.callOrder(giftRepository.update, giftEmailService.sendReminder);
        });

        it('does not mark the gift as reminded when the tier is missing so an admin fix recovers the reminder', async function () {
            const gift = buildRedeemedGift();

            giftRepository.findPendingReminder.resolves([gift]);
            giftRepository.getByToken.resolves(gift);
            tiersService.api.read.resolves(null);

            const service = createService();
            const result = await service.processReminders();

            assert.equal(result.remindedCount, 0);
            assert.equal(result.skippedCount, 0);
            assert.equal(result.failedCount, 1);

            // Tier is read up front, but the transaction never runs, so the gift
            // is neither locked nor marked as reminded. A follow-up run after the
            // tier is restored will pick the gift up again.
            sinon.assert.notCalled(giftRepository.update);
            sinon.assert.notCalled(giftEmailService.sendReminder);
        });

        it('continues processing the batch when one gift fails', async function () {
            // Gift 1 will fail at the email stage; gift 2 should still be processed.
            const gift1 = buildRedeemedGift({token: 'gift-1', redeemerMemberId: 'member_1'});
            const gift2 = buildRedeemedGift({token: 'gift-2', redeemerMemberId: 'member_2'});

            giftRepository.findPendingReminder.resolves([gift1, gift2]);

            // getByToken resolves regardless of whether the lock options are passed.
            giftRepository.getByToken
                .withArgs('gift-1').resolves(gift1)
                .withArgs('gift-1', sinon.match.any).resolves(gift1)
                .withArgs('gift-2').resolves(gift2)
                .withArgs('gift-2', sinon.match.any).resolves(gift2);

            memberRepository.get
                .withArgs({id: 'member_1'}, sinon.match.any).resolves(buildRedeemer('member_1'))
                .withArgs({id: 'member_2'}, sinon.match.any).resolves(buildRedeemer('member_2'));

            giftEmailService.sendReminder
                .onFirstCall().rejects(new Error('Transient SMTP error'))
                .onSecondCall().resolves(undefined);

            const service = createService();
            const result = await service.processReminders();

            assert.equal(result.remindedCount, 1);
            assert.equal(result.skippedCount, 0);
            assert.equal(result.failedCount, 1);

            // Both gifts were claimed (marked as reminded inside their transactions),
            // and both emails were attempted.
            assert.equal(giftRepository.update.callCount, 2);
            assert.equal(giftEmailService.sendReminder.callCount, 2);
        });

        it('handles multiple gifts independently', async function () {
            const gift1 = buildRedeemedGift({token: 'gift-1', redeemerMemberId: 'member_1'});
            const gift2 = buildRedeemedGift({token: 'gift-2', redeemerMemberId: 'member_2'});

            giftRepository.findPendingReminder.resolves([gift1, gift2]);
            giftRepository.getByToken
                .withArgs('gift-1').resolves(gift1)
                .withArgs('gift-1', sinon.match.any).resolves(gift1)
                .withArgs('gift-2').resolves(gift2)
                .withArgs('gift-2', sinon.match.any).resolves(gift2);

            memberRepository.get
                .withArgs({id: 'member_1'}, sinon.match.any).resolves(buildRedeemer('member_1'))
                .withArgs({id: 'member_2'}, sinon.match.any).resolves(buildRedeemer('member_2'));

            const service = createService();
            const result = await service.processReminders();

            assert.equal(result.remindedCount, 2);
            assert.equal(result.skippedCount, 0);
            assert.equal(result.failedCount, 0);
            assert.equal(giftEmailService.sendReminder.callCount, 2);
            assert.equal(giftRepository.update.callCount, 2);
        });
    });

    describe('redeem', function () {
        it('redeems the gift, saves it, and grants gift access to the member', async function () {
            const gift = buildGift();
            const memberGet = sinon.stub();

            memberGet.withArgs('status').returns('free');
            memberGet.withArgs('name').returns('Member Name');
            memberGet.withArgs('email').returns('member@example.com');

            giftRepository.getByToken.resolves(gift);
            memberRepository.get.resolves({
                id: 'member_1',
                get: memberGet
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
            sinon.assert.calledOnceWithExactly(tiersService.api.read, 'tier_1');
            sinon.assert.calledOnceWithExactly(staffServiceEmails.notifyGiftSubscriptionStarted, {
                memberId: 'member_1',
                memberEmail: 'member@example.com',
                memberName: 'Member Name',
                tierName: 'Bronze',
                buyerEmail: 'buyer@example.com'
            });
            assert.equal(redeemed.status, 'redeemed');
            assert.equal(redeemed.redeemerMemberId, 'member_1');
            assert.notEqual(redeemed.consumesAt, null);
        });

        it('does not fail redemption when staff notification email throws', async function () {
            const gift = buildGift();
            const memberGet = sinon.stub();

            memberGet.withArgs('status').returns('free');
            memberGet.withArgs('name').returns('Member Name');
            memberGet.withArgs('email').returns('member@example.com');

            giftRepository.getByToken.resolves(gift);
            memberRepository.get.resolves({
                id: 'member_1',
                get: memberGet
            });
            staffServiceEmails.notifyGiftSubscriptionStarted.rejects(new Error('SMTP error'));

            const service = createService();
            const redeemed = await service.redeem({
                token: 'gift-token',
                memberId: 'member_1'
            });

            assert.equal(redeemed.status, 'redeemed');
            sinon.assert.calledOnce(staffServiceEmails.notifyGiftSubscriptionStarted);
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
            sinon.assert.notCalled(staffServiceEmails.notifyGiftSubscriptionStarted);
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
            sinon.assert.notCalled(staffServiceEmails.notifyGiftSubscriptionStarted);
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
            sinon.assert.notCalled(staffServiceEmails.notifyGiftSubscriptionStarted);
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
            memberRepository.get.resolves({
                id: 'redeemer_1',
                get: sinon.stub().withArgs('status').returns('gift')
            });

            const service = createService();
            const result = await service.refund('pi_456');

            assert.equal(result, true);
            sinon.assert.calledOnce(giftRepository.update);
            sinon.assert.calledOnce(giftRepository.transaction);
            sinon.assert.calledOnceWithExactly(memberRepository.get, {id: 'redeemer_1'}, {transacting: 'trx'});
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

            sinon.assert.notCalled(memberRepository.get);
            sinon.assert.notCalled(memberRepository.update);
        });

        it('does not downgrade when the redeemer is no longer in gift status', async function () {
            const gift = buildGift({
                status: 'redeemed',
                redeemerMemberId: 'redeemer_1',
                redeemedAt: new Date('2026-02-01T00:00:00.000Z'),
                consumesAt: new Date('2027-02-01T00:00:00.000Z')
            });

            giftRepository.getByPaymentIntentId.resolves(gift);
            memberRepository.get.resolves({
                id: 'redeemer_1',
                get: sinon.stub().withArgs('status').returns('paid')
            });

            const service = createService();
            const result = await service.refund('pi_456');

            assert.equal(result, true);
            sinon.assert.calledOnce(giftRepository.update);
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
            memberRepository.get.resolves({
                id: 'redeemer_1',
                get: sinon.stub().withArgs('status').returns('gift')
            });
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
