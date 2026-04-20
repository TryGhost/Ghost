import assert from 'node:assert/strict';
import sinon from 'sinon';
import {GiftBookshelfRepository} from '../../../../../core/server/services/gifts/gift-bookshelf-repository';
import {Gift} from '../../../../../core/server/services/gifts/gift';

describe('GiftBookshelfRepository', function () {
    afterEach(function () {
        sinon.restore();
    });

    it('returns a Gift when a token matches', async function () {
        const GiftModel = {
            add: sinon.stub(),
            transaction: sinon.stub(),
            findOne: sinon.stub().resolves({
                save: sinon.stub(),
                set: sinon.stub(),
                toJSON() {
                    return {
                        token: 'gift-token',
                        buyer_email: 'buyer@example.com',
                        buyer_member_id: 'buyer_member_1',
                        redeemer_member_id: null,
                        tier_id: 'tier_1',
                        cadence: 'year',
                        duration: 1,
                        currency: 'usd',
                        amount: 5000,
                        stripe_checkout_session_id: 'cs_123',
                        stripe_payment_intent_id: 'pi_456',
                        consumes_at: null,
                        expires_at: new Date('2030-01-01T00:00:00.000Z'),
                        status: 'purchased',
                        purchased_at: new Date('2026-01-01T00:00:00.000Z'),
                        redeemed_at: null,
                        consumed_at: null,
                        expired_at: null,
                        refunded_at: null
                    };
                }
            }),
            findAll: sinon.stub()
        };
        const repository = new GiftBookshelfRepository({GiftModel});

        const gift = await repository.getByToken('gift-token');

        sinon.assert.calledOnceWithExactly(GiftModel.findOne, {
            token: 'gift-token'
        }, {require: false});
        assert.ok(gift instanceof Gift);
        assert.equal(gift?.token, 'gift-token');
        assert.equal(gift?.tierId, 'tier_1');
    });

    it('forwards transaction locking options when fetching by token', async function () {
        const GiftModel = {
            add: sinon.stub(),
            transaction: sinon.stub(),
            findOne: sinon.stub().resolves(null),
            findAll: sinon.stub()
        };
        const repository = new GiftBookshelfRepository({GiftModel});

        await repository.getByToken('gift-token', {transacting: 'trx', forUpdate: true});

        sinon.assert.calledOnceWithExactly(GiftModel.findOne, {
            token: 'gift-token'
        }, {require: false, transacting: 'trx', forUpdate: true});
    });

    it('returns null when no gift matches the token', async function () {
        const GiftModel = {
            add: sinon.stub(),
            transaction: sinon.stub(),
            findOne: sinon.stub().resolves(null),
            findAll: sinon.stub()
        };
        const repository = new GiftBookshelfRepository({GiftModel});

        const gift = await repository.getByToken('missing-token');

        assert.equal(gift, null);
    });

    it('updates an existing gift', async function () {
        const existing = {
            save: sinon.stub().resolves(undefined),
            set: sinon.stub(),
            toJSON() {
                return {
                    token: 'gift-token',
                    buyer_email: 'buyer@example.com',
                    buyer_member_id: 'buyer_member_1',
                    redeemer_member_id: null,
                    tier_id: 'tier_1',
                    cadence: 'year',
                    duration: 1,
                    currency: 'usd',
                    amount: 5000,
                    stripe_checkout_session_id: 'cs_123',
                    stripe_payment_intent_id: 'pi_456',
                    consumes_at: null,
                    expires_at: new Date('2030-01-01T00:00:00.000Z'),
                    status: 'purchased',
                    purchased_at: new Date('2026-01-01T00:00:00.000Z'),
                    redeemed_at: null,
                    consumed_at: null,
                    expired_at: null,
                    refunded_at: null
                };
            }
        };
        const GiftModel = {
            add: sinon.stub(),
            transaction: sinon.stub(),
            findOne: sinon.stub().resolves(existing),
            findAll: sinon.stub()
        };
        const repository = new GiftBookshelfRepository({GiftModel});
        const gift = new Gift({
            token: 'gift-token',
            buyerEmail: 'buyer@example.com',
            buyerMemberId: 'buyer_member_1',
            redeemerMemberId: 'member_2',
            tierId: 'tier_1',
            cadence: 'year',
            duration: 1,
            currency: 'usd',
            amount: 5000,
            stripeCheckoutSessionId: 'cs_123',
            stripePaymentIntentId: 'pi_456',
            consumesAt: new Date('2031-01-01T00:00:00.000Z'),
            expiresAt: new Date('2030-01-01T00:00:00.000Z'),
            status: 'redeemed',
            purchasedAt: new Date('2026-01-01T00:00:00.000Z'),
            redeemedAt: new Date('2030-01-01T00:00:00.000Z'),
            consumedAt: null,
            expiredAt: null,
            refundedAt: null,
            consumesSoonReminderSentAt: null
        });

        await repository.update(gift, {transacting: 'trx'});

        sinon.assert.calledOnceWithExactly(GiftModel.findOne, {
            token: 'gift-token'
        }, {require: false, transacting: 'trx'});
        sinon.assert.calledOnce(existing.save);
        assert.equal(existing.save.firstCall.args[0].status, 'redeemed');
        assert.equal(existing.save.firstCall.args[0].redeemer_member_id, 'member_2');
        assert.equal(existing.save.firstCall.args[1].transacting, 'trx');
        assert.equal(existing.save.firstCall.args[1].method, 'update');
        assert.equal(existing.save.firstCall.args[1].patch, true);
    });

    it('throws InternalServerError when updating a gift that does not exist', async function () {
        const GiftModel = {
            add: sinon.stub(),
            transaction: sinon.stub(),
            findOne: sinon.stub().resolves(null),
            findAll: sinon.stub()
        };
        const repository = new GiftBookshelfRepository({GiftModel});
        const gift = new Gift({
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
            consumesSoonReminderSentAt: null
        });

        await assert.rejects(
            () => repository.update(gift, {transacting: 'trx'}),
            (err: any) => {
                assert.equal(err.errorType, 'InternalServerError');
                assert.equal(err.message, 'Gift not found: gift-token');
                return true;
            }
        );
    });

    it('delegates transaction callbacks to the model', async function () {
        const GiftModel = {
            add: sinon.stub(),
            transaction: sinon.stub().callsFake(async (callback) => {
                return await callback('trx');
            }),
            findOne: sinon.stub(),
            findAll: sinon.stub()
        };
        const repository = new GiftBookshelfRepository({GiftModel});

        const result = await repository.transaction(async (transacting) => {
            assert.equal(transacting, 'trx');
            return 'done';
        });

        sinon.assert.calledOnce(GiftModel.transaction);
        assert.equal(result, 'done');
    });

    it('finds gifts pending consumption using current time', async function () {
        const before = new Date();

        const GiftModel = {
            add: sinon.stub(),
            transaction: sinon.stub(),
            findOne: sinon.stub(),
            findAll: sinon.stub().resolves({
                models: [{
                    toJSON() {
                        return {
                            token: 'gift-token',
                            buyer_email: 'buyer@example.com',
                            buyer_member_id: 'buyer_member_1',
                            redeemer_member_id: 'member_2',
                            tier_id: 'tier_1',
                            cadence: 'year',
                            duration: 1,
                            currency: 'usd',
                            amount: 5000,
                            stripe_checkout_session_id: 'cs_123',
                            stripe_payment_intent_id: 'pi_456',
                            consumes_at: new Date('2026-01-01T00:00:00.000Z'),
                            expires_at: new Date('2030-01-01T00:00:00.000Z'),
                            status: 'redeemed',
                            purchased_at: new Date('2025-01-01T00:00:00.000Z'),
                            redeemed_at: new Date('2025-01-01T12:00:00.000Z'),
                            consumed_at: null,
                            expired_at: null,
                            refunded_at: null
                        };
                    }
                }]
            })
        };
        const repository = new GiftBookshelfRepository({GiftModel});

        const gifts = await repository.findPendingConsumption();

        const after = new Date();

        assert.equal(gifts.length, 1);
        assert.equal(gifts[0].token, 'gift-token');
        assert.equal(gifts[0].status, 'redeemed');

        sinon.assert.calledOnce(GiftModel.findAll);

        const filterArg = GiftModel.findAll.getCall(0).args[0].filter;
        assert.ok(filterArg.startsWith('status:redeemed+consumes_at:<\''));

        const dateStr = filterArg.match(/consumes_at:<'(.+)'/)[1];
        const filterDate = new Date(dateStr);

        assert.ok(filterDate >= before);
        assert.ok(filterDate <= after);
    });

    it('finds gifts pending reminders within the configured window that have not yet received a reminder', async function () {
        const GiftModel = {
            add: sinon.stub(),
            transaction: sinon.stub(),
            findOne: sinon.stub(),
            findAll: sinon.stub().resolves({
                models: [{
                    toJSON() {
                        return {
                            token: 'gift-token',
                            buyer_email: 'buyer@example.com',
                            buyer_member_id: 'buyer_member_1',
                            redeemer_member_id: 'member_2',
                            tier_id: 'tier_1',
                            cadence: 'year',
                            duration: 1,
                            currency: 'usd',
                            amount: 5000,
                            stripe_checkout_session_id: 'cs_123',
                            stripe_payment_intent_id: 'pi_456',
                            consumes_at: new Date('2026-04-20T00:00:00.000Z'),
                            expires_at: new Date('2030-01-01T00:00:00.000Z'),
                            status: 'redeemed',
                            purchased_at: new Date('2025-01-01T00:00:00.000Z'),
                            redeemed_at: new Date('2025-04-20T00:00:00.000Z'),
                            consumed_at: null,
                            expired_at: null,
                            refunded_at: null,
                            consumes_soon_reminder_sent_at: null
                        };
                    }
                }]
            })
        };
        const repository = new GiftBookshelfRepository({GiftModel});

        const now = new Date('2026-04-16T00:00:00.000Z');
        const reminderLeadMs = 7 * 24 * 60 * 60 * 1000;
        const reminderFloorMs = 3 * 24 * 60 * 60 * 1000;

        const gifts = await repository.findPendingReminder({
            now,
            reminderLeadMs,
            reminderFloorMs,
            transacting: 'trx'
        });

        assert.equal(gifts.length, 1);
        assert.equal(gifts[0].token, 'gift-token');
        assert.equal(gifts[0].consumesSoonReminderSentAt, null);

        sinon.assert.calledOnce(GiftModel.findAll);

        const callArgs = GiftModel.findAll.getCall(0).args[0];
        const filterArg: string = callArgs.filter;
        const upperIso = new Date(now.getTime() + reminderLeadMs).toISOString();
        const lowerIso = new Date(now.getTime() + reminderFloorMs).toISOString();

        assert.equal(callArgs.transacting, 'trx');
        assert.ok(filterArg.startsWith('status:redeemed'));
        assert.ok(filterArg.includes(`consumes_at:<='${upperIso}'`));
        assert.ok(filterArg.includes(`consumes_at:>'${lowerIso}'`));
        assert.ok(filterArg.includes('consumes_soon_reminder_sent_at:null'));
    });

    it('reads consumes_soon_reminder_sent_at into the domain gift', async function () {
        const reminderSentAt = new Date('2026-04-13T00:00:00.000Z');

        const GiftModel = {
            add: sinon.stub(),
            transaction: sinon.stub(),
            findOne: sinon.stub().resolves({
                save: sinon.stub(),
                set: sinon.stub(),
                toJSON() {
                    return {
                        token: 'gift-token',
                        buyer_email: 'buyer@example.com',
                        buyer_member_id: 'buyer_member_1',
                        redeemer_member_id: 'member_2',
                        tier_id: 'tier_1',
                        cadence: 'year',
                        duration: 1,
                        currency: 'usd',
                        amount: 5000,
                        stripe_checkout_session_id: 'cs_123',
                        stripe_payment_intent_id: 'pi_456',
                        consumes_at: new Date('2026-04-20T00:00:00.000Z'),
                        expires_at: new Date('2030-01-01T00:00:00.000Z'),
                        status: 'redeemed',
                        purchased_at: new Date('2025-01-01T00:00:00.000Z'),
                        redeemed_at: new Date('2025-04-20T00:00:00.000Z'),
                        consumed_at: null,
                        expired_at: null,
                        refunded_at: null,
                        consumes_soon_reminder_sent_at: reminderSentAt
                    };
                }
            }),
            findAll: sinon.stub()
        };
        const repository = new GiftBookshelfRepository({GiftModel});

        const gift = await repository.getByToken('gift-token');

        assert.ok(gift);
        assert.equal(gift.consumesSoonReminderSentAt?.toISOString(), reminderSentAt.toISOString());
    });

    it('writes consumes_soon_reminder_sent_at through update', async function () {
        const existing = {
            save: sinon.stub().resolves(undefined),
            set: sinon.stub(),
            toJSON() {
                return {
                    token: 'gift-token',
                    buyer_email: 'buyer@example.com',
                    buyer_member_id: 'buyer_member_1',
                    redeemer_member_id: 'member_2',
                    tier_id: 'tier_1',
                    cadence: 'year',
                    duration: 1,
                    currency: 'usd',
                    amount: 5000,
                    stripe_checkout_session_id: 'cs_123',
                    stripe_payment_intent_id: 'pi_456',
                    consumes_at: new Date('2026-04-20T00:00:00.000Z'),
                    expires_at: new Date('2030-01-01T00:00:00.000Z'),
                    status: 'redeemed',
                    purchased_at: new Date('2025-01-01T00:00:00.000Z'),
                    redeemed_at: new Date('2025-04-20T00:00:00.000Z'),
                    consumed_at: null,
                    expired_at: null,
                    refunded_at: null,
                    consumes_soon_reminder_sent_at: null
                };
            }
        };
        const GiftModel = {
            add: sinon.stub(),
            transaction: sinon.stub(),
            findOne: sinon.stub().resolves(existing),
            findAll: sinon.stub()
        };
        const repository = new GiftBookshelfRepository({GiftModel});
        const reminderSentAt = new Date('2026-04-13T00:00:00.000Z');
        const gift = new Gift({
            token: 'gift-token',
            buyerEmail: 'buyer@example.com',
            buyerMemberId: 'buyer_member_1',
            redeemerMemberId: 'member_2',
            tierId: 'tier_1',
            cadence: 'year',
            duration: 1,
            currency: 'usd',
            amount: 5000,
            stripeCheckoutSessionId: 'cs_123',
            stripePaymentIntentId: 'pi_456',
            consumesAt: new Date('2026-04-20T00:00:00.000Z'),
            expiresAt: new Date('2030-01-01T00:00:00.000Z'),
            status: 'redeemed',
            purchasedAt: new Date('2025-01-01T00:00:00.000Z'),
            redeemedAt: new Date('2025-04-20T00:00:00.000Z'),
            consumedAt: null,
            expiredAt: null,
            refundedAt: null,
            consumesSoonReminderSentAt: reminderSentAt
        });

        await repository.update(gift, {transacting: 'trx'});

        sinon.assert.calledOnce(existing.save);

        const savedRow = existing.save.firstCall.args[0];

        assert.equal(savedRow.consumes_soon_reminder_sent_at, reminderSentAt);
    });

    it('finds gifts pending expiration using current time', async function () {
        const before = new Date();

        const GiftModel = {
            add: sinon.stub(),
            transaction: sinon.stub(),
            findOne: sinon.stub(),
            findAll: sinon.stub().resolves({
                models: [{
                    toJSON() {
                        return {
                            token: 'gift-token',
                            buyer_email: 'buyer@example.com',
                            buyer_member_id: 'buyer_member_1',
                            redeemer_member_id: null,
                            tier_id: 'tier_1',
                            cadence: 'year',
                            duration: 1,
                            currency: 'usd',
                            amount: 5000,
                            stripe_checkout_session_id: 'cs_123',
                            stripe_payment_intent_id: 'pi_456',
                            consumes_at: null,
                            expires_at: new Date('2025-01-01T00:00:00.000Z'),
                            status: 'purchased',
                            purchased_at: new Date('2024-01-01T00:00:00.000Z'),
                            redeemed_at: null,
                            consumed_at: null,
                            expired_at: null,
                            refunded_at: null
                        };
                    }
                }]
            })
        };
        const repository = new GiftBookshelfRepository({GiftModel});

        const gifts = await repository.findPendingExpiration();

        const after = new Date();

        assert.equal(gifts.length, 1);
        assert.equal(gifts[0].token, 'gift-token');
        assert.equal(gifts[0].status, 'purchased');

        sinon.assert.calledOnce(GiftModel.findAll);

        const filterArg = GiftModel.findAll.getCall(0).args[0].filter;
        assert.ok(filterArg.startsWith('status:purchased+expires_at:<\''));

        const dateStr = filterArg.match(/expires_at:<'(.+)'/)[1];
        const filterDate = new Date(dateStr);

        assert.ok(filterDate >= before);
        assert.ok(filterDate <= after);
    });
});
