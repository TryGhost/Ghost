import assert from 'node:assert/strict';
import sinon from 'sinon';
import type {Knex} from 'knex';
import {GiftBookshelfRepository} from '../../../../../core/server/services/gifts/gift-bookshelf-repository';
import {Gift} from '../../../../../core/server/services/gifts/gift';

type GiftBookshelfModel = ConstructorParameters<typeof GiftBookshelfRepository>[0]['GiftModel'];
type TestGiftBookshelfModel = Omit<GiftBookshelfModel, 'findPage'> & Partial<Pick<GiftBookshelfModel, 'findPage'>>;

const transacting = 'trx' as unknown as Knex.Transaction;

describe('GiftBookshelfRepository', function () {
    function createRepository(GiftModel: TestGiftBookshelfModel): GiftBookshelfRepository {
        return new GiftBookshelfRepository({
            GiftModel: {
                findPage: sinon.stub(),
                ...GiftModel
            },
            knex: sinon.stub() as unknown as Knex
        });
    }

    function buildBaseGiftRow(overrides: Record<string, unknown> = {}) {
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
            refunded_at: null,
            consumes_soon_reminder_sent_at: null,
            ...overrides
        };
    }

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
        const repository = createRepository(GiftModel);

        const gift = await repository.getByToken('gift-token');

        sinon.assert.calledOnceWithExactly(GiftModel.findOne, {
            token: 'gift-token'
        }, {require: false});
        assert.ok(gift instanceof Gift);
        assert.equal(gift?.token, 'gift-token');
        assert.equal(gift?.tierId, 'tier_1');
        assert.equal(gift?.checkoutStartedAt, null);
    });

    it('normalizes database date representations before constructing a Gift', async function () {
        const GiftModel = {
            add: sinon.stub(),
            transaction: sinon.stub(),
            findOne: sinon.stub().resolves({
                save: sinon.stub(),
                set: sinon.stub(),
                toJSON: () => buildBaseGiftRow({
                    expires_at: '2030-01-01T00:00:00.000Z',
                    purchased_at: Date.parse('2026-01-01T00:00:00.000Z')
                })
            }),
            findAll: sinon.stub()
        };
        const repository = createRepository(GiftModel);

        const gift = await repository.getByToken('gift-token');

        assert.ok(gift?.expiresAt instanceof Date);
        assert.equal(gift.expiresAt.toISOString(), '2030-01-01T00:00:00.000Z');
        assert.ok(gift.purchasedAt instanceof Date);
        assert.equal(gift.purchasedAt.toISOString(), '2026-01-01T00:00:00.000Z');
    });

    it('rejects a persisted row with an invalid domain value', async function () {
        const GiftModel = {
            add: sinon.stub(),
            transaction: sinon.stub(),
            findOne: sinon.stub().resolves({
                save: sinon.stub(),
                set: sinon.stub(),
                toJSON: () => buildBaseGiftRow({cadence: 'week'})
            }),
            findAll: sinon.stub()
        };
        const repository = createRepository(GiftModel);

        await assert.rejects(() => repository.getByToken('gift-token'), {
            name: 'ZodError'
        });
    });

    it('forwards transaction locking options when fetching by token', async function () {
        const GiftModel = {
            add: sinon.stub(),
            transaction: sinon.stub(),
            findOne: sinon.stub().resolves(null),
            findAll: sinon.stub()
        };
        const repository = createRepository(GiftModel);

        await repository.getByToken('gift-token', {transacting, forUpdate: true});

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
        const repository = createRepository(GiftModel);

        const gift = await repository.getByToken('missing-token');

        assert.equal(gift, null);
    });

    it('returns the persisted id when creating a gift', async function () {
        const GiftModel = {
            add: sinon.stub().resolves({
                toJSON: () => ({id: 'gift_1'})
            }),
            transaction: sinon.stub(),
            findOne: sinon.stub(),
            findAll: sinon.stub()
        };
        const repository = createRepository(GiftModel);
        const gift = Gift.fromPurchase({
            token: 'gift-token',
            buyerEmail: 'buyer@example.com',
            buyerMemberId: null,
            tierId: 'tier_1',
            cadence: 'year',
            duration: 1,
            currency: 'usd',
            amount: 5000,
            stripeCheckoutSessionId: 'cs_123',
            stripePaymentIntentId: 'pi_456',
            purchasedAt: new Date('2026-08-18T23:30:00.000Z'),
            expiresAt: new Date('2027-08-19T06:59:59.999Z')
        });

        const id = await repository.create(gift, {transacting});

        assert.equal(id, 'gift_1');
        sinon.assert.calledOnce(GiftModel.add);
        assert.equal(GiftModel.add.firstCall.args[1].transacting, 'trx');
    });

    it('rejects a created gift without a persisted id', async function () {
        const GiftModel = {
            add: sinon.stub().resolves({
                toJSON: () => ({})
            }),
            transaction: sinon.stub(),
            findOne: sinon.stub(),
            findAll: sinon.stub()
        };
        const repository = createRepository(GiftModel);
        const gift = Gift.fromPurchase({
            token: 'gift-token',
            buyerEmail: 'buyer@example.com',
            buyerMemberId: null,
            tierId: 'tier_1',
            cadence: 'year',
            duration: 1,
            currency: 'usd',
            amount: 5000,
            stripeCheckoutSessionId: 'cs_123',
            stripePaymentIntentId: 'pi_456',
            purchasedAt: new Date('2026-08-18T23:30:00.000Z'),
            expiresAt: new Date('2027-08-19T06:59:59.999Z')
        });

        await assert.rejects(() => repository.create(gift), {
            message: 'Created gift is missing an id'
        });
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
        const repository = createRepository(GiftModel);
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

        await repository.update(gift, {transacting});

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
        const repository = createRepository(GiftModel);
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
            () => repository.update(gift, {transacting}),
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
                return await callback(transacting);
            }),
            findOne: sinon.stub(),
            findAll: sinon.stub()
        };
        const repository = createRepository(GiftModel);

        const result = await repository.transaction(async (transaction) => {
            assert.equal(transaction, 'trx');
            return 'done';
        });

        sinon.assert.calledOnce(GiftModel.transaction);
        assert.equal(result, 'done');
    });

    it('maps purchase rows to gift purchase events', async function () {
        const GiftModel = {
            add: sinon.stub(),
            transaction: sinon.stub(),
            findOne: sinon.stub(),
            findAll: sinon.stub(),
            findPage: sinon.stub().resolves({
                data: [{
                    toJSON: () => ({
                        id: 'gift_1',
                        buyer_member_id: 'member_1',
                        buyer: {id: 'member_1', email: 'buyer@example.com'},
                        tier: {name: 'Gold'},
                        cadence: 'year',
                        duration: 1,
                        amount: 12000,
                        currency: 'usd',
                        purchased_at: '2026-07-30T00:00:00.000Z',
                        token: 'private-token'
                    })
                }],
                meta: {pagination: {page: 1}}
            })
        };
        const repository = createRepository(GiftModel);

        const result = await repository.browsePurchaseEvents({
            order: 'created_at desc, id desc'
        }, {type: 'unused'});

        sinon.assert.calledOnceWithMatch(GiftModel.findPage, {
            withRelated: ['buyer', 'tier'],
            filter: 'buyer_member_id:-null+purchased_at:-null+custom:true',
            order: 'purchased_at desc, id desc',
            useBasicCount: true
        });
        assert.deepEqual(result.data, [{
            type: 'gift_purchase_event',
            data: {
                id: 'gift_1',
                member: {id: 'member_1', email: 'buyer@example.com'},
                member_id: 'member_1',
                tier_name: 'Gold',
                cadence: 'year',
                duration: 1,
                amount: 12000,
                currency: 'usd',
                created_at: '2026-07-30T00:00:00.000Z'
            }
        }]);
        assert.equal('token' in result.data[0].data, false);
    });

    it('maps redemption rows to gift redemption events', async function () {
        const GiftModel = {
            add: sinon.stub(),
            transaction: sinon.stub(),
            findOne: sinon.stub(),
            findAll: sinon.stub(),
            findPage: sinon.stub().resolves({
                data: [{
                    toJSON: () => ({
                        id: 'gift_1',
                        redeemer_member_id: 'member_2',
                        redeemer: {id: 'member_2', email: 'recipient@example.com'},
                        tier: {name: 'Gold'},
                        cadence: 'month',
                        duration: 3,
                        amount: 3000,
                        currency: 'eur',
                        redeemed_at: '2026-08-01T00:00:00.000Z'
                    })
                }],
                meta: {}
            })
        };
        const repository = createRepository(GiftModel);

        const result = await repository.browseRedemptionEvents({
            order: 'created_at asc'
        }, {});

        sinon.assert.calledOnceWithMatch(GiftModel.findPage, {
            withRelated: ['redeemer', 'tier'],
            filter: 'redeemer_member_id:-null+redeemed_at:-null+custom:true',
            order: 'redeemed_at asc',
            useBasicCount: true
        });
        assert.deepEqual(result.data[0], {
            type: 'gift_redemption_event',
            data: {
                id: 'gift_1',
                member: {id: 'member_2', email: 'recipient@example.com'},
                member_id: 'member_2',
                tier_name: 'Gold',
                cadence: 'month',
                duration: 3,
                amount: 3000,
                currency: 'eur',
                created_at: '2026-08-01T00:00:00.000Z'
            }
        });
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
        const repository = createRepository(GiftModel);

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
        const repository = createRepository(GiftModel);

        const now = new Date('2026-04-16T00:00:00.000Z');
        const reminderLeadMs = 7 * 24 * 60 * 60 * 1000;
        const reminderFloorMs = 3 * 24 * 60 * 60 * 1000;

        const gifts = await repository.findPendingReminder({
            now,
            reminderLeadMs,
            reminderFloorMs,
            transacting
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
        const repository = createRepository(GiftModel);

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
        const repository = createRepository(GiftModel);
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

        await repository.update(gift, {transacting});

        sinon.assert.calledOnce(existing.save);

        const savedRow = existing.save.firstCall.args[0];

        assert.deepEqual(savedRow.consumes_soon_reminder_sent_at, reminderSentAt);
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
        const repository = createRepository(GiftModel);

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

    describe('getActiveByMember', function () {
        function stubGiftModel({model}: {model: {toJSON(): {status?: string}} | null}) {
            // Mimic bookshelf's findOne: only matches when every field in the
            // query equals the corresponding field on the row.
            const findOne = sinon.stub().callsFake((data: Record<string, unknown>) => {
                if (!model) {
                    return Promise.resolve(null);
                }
                const row = model.toJSON() as Record<string, unknown>;
                const matches = Object.entries(data).every(([key, value]) => row[key] === value);
                return Promise.resolve(matches ? model : null);
            });
            return {
                add: sinon.stub(),
                transaction: sinon.stub(),
                findAll: sinon.stub(),
                findOne
            };
        }

        function buildGiftRow(overrides: Record<string, unknown> = {}) {
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
                consumes_at: new Date('2027-01-01T00:00:00.000Z'),
                expires_at: new Date('2030-01-01T00:00:00.000Z'),
                status: 'redeemed',
                purchased_at: new Date('2026-01-01T00:00:00.000Z'),
                redeemed_at: new Date('2026-06-01T00:00:00.000Z'),
                consumed_at: null,
                expired_at: null,
                refunded_at: null,
                ...overrides
            };
        }

        it('returns the redeemed gift for a member', async function () {
            const GiftModel = stubGiftModel({
                model: {toJSON: () => buildGiftRow()}
            });
            const repository = createRepository(GiftModel);

            const gift = await repository.getActiveByMember('member_2');

            assert.ok(gift instanceof Gift);
            assert.equal(gift?.token, 'gift-token');
            assert.equal(gift?.status, 'redeemed');

            sinon.assert.calledOnce(GiftModel.findOne);

            const [data, options] = GiftModel.findOne.getCall(0).args;
            assert.deepEqual(data, {redeemer_member_id: 'member_2', status: 'redeemed'});
            assert.equal(options.require, false);
        });

        it('returns null when no redeemed gift exists for the member', async function () {
            const GiftModel = stubGiftModel({model: null});
            const repository = createRepository(GiftModel);

            const gift = await repository.getActiveByMember('member_without_gift');

            assert.equal(gift, null);
        });

        it('returns null when redeemed gift is consumed', async function () {
            const GiftModel = stubGiftModel({
                model: {
                    toJSON: () => buildGiftRow({
                        status: 'consumed',
                        consumed_at: new Date('2027-01-01T00:00:00.000Z')
                    })
                }
            });
            const repository = createRepository(GiftModel);

            const gift = await repository.getActiveByMember('member_2');

            assert.equal(gift, null);
        });

        it('returns null when redeemed gift is refunded', async function () {
            const GiftModel = stubGiftModel({
                model: {
                    toJSON: () => buildGiftRow({
                        status: 'refunded',
                        refunded_at: new Date('2026-07-01T00:00:00.000Z')
                    })
                }
            });
            const repository = createRepository(GiftModel);

            const gift = await repository.getActiveByMember('member_2');

            assert.equal(gift, null);
        });
    });

    describe('getActiveByMembers', function () {
        function buildGiftRow(overrides: Record<string, unknown> = {}) {
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
                consumes_at: new Date('2027-01-01T00:00:00.000Z'),
                expires_at: new Date('2030-01-01T00:00:00.000Z'),
                status: 'redeemed',
                purchased_at: new Date('2026-01-01T00:00:00.000Z'),
                redeemed_at: new Date('2026-06-01T00:00:00.000Z'),
                consumed_at: null,
                expired_at: null,
                refunded_at: null,
                ...overrides
            };
        }

        it('returns an empty map without hitting the model when memberIds is empty', async function () {
            const GiftModel = {
                add: sinon.stub(),
                transaction: sinon.stub(),
                findOne: sinon.stub(),
                findAll: sinon.stub()
            };
            const repository = createRepository(GiftModel);

            const result = await repository.getActiveByMembers([]);

            assert.equal(result.size, 0);
            sinon.assert.notCalled(GiftModel.findAll);
        });

        it('queries with an NQL filter for redeemed status and the supplied member ids', async function () {
            const GiftModel = {
                add: sinon.stub(),
                transaction: sinon.stub(),
                findOne: sinon.stub(),
                findAll: sinon.stub().resolves({models: []})
            };
            const repository = createRepository(GiftModel);

            await repository.getActiveByMembers(['member_1', 'member_2']);

            sinon.assert.calledOnce(GiftModel.findAll);
            const callArg = GiftModel.findAll.firstCall.args[0];
            assert.equal(
                callArg.filter,
                `redeemer_member_id:['member_1','member_2']+status:redeemed`
            );
        });

        it('keys returned gifts by their redeemer_member_id', async function () {
            const GiftModel = {
                add: sinon.stub(),
                transaction: sinon.stub(),
                findOne: sinon.stub(),
                findAll: sinon.stub().resolves({
                    models: [
                        {toJSON: () => buildGiftRow({token: 'token-a', redeemer_member_id: 'member_1'})},
                        {toJSON: () => buildGiftRow({token: 'token-b', redeemer_member_id: 'member_2'})}
                    ]
                })
            };
            const repository = createRepository(GiftModel);

            const result = await repository.getActiveByMembers(['member_1', 'member_2']);

            assert.equal(result.size, 2);
            assert.equal(result.get('member_1')?.token, 'token-a');
            assert.equal(result.get('member_2')?.token, 'token-b');
        });

        it('skips rows without a redeemer_member_id', async function () {
            const GiftModel = {
                add: sinon.stub(),
                transaction: sinon.stub(),
                findOne: sinon.stub(),
                findAll: sinon.stub().resolves({
                    models: [
                        {toJSON: () => buildGiftRow({token: 'token-a', redeemer_member_id: 'member_1'})},
                        {toJSON: () => buildGiftRow({token: 'token-orphan', redeemer_member_id: null})}
                    ]
                })
            };
            const repository = createRepository(GiftModel);

            const result = await repository.getActiveByMembers(['member_1']);

            assert.equal(result.size, 1);
            assert.equal(result.get('member_1')?.token, 'token-a');
        });

        it('forwards transacting options to the model', async function () {
            const GiftModel = {
                add: sinon.stub(),
                transaction: sinon.stub(),
                findOne: sinon.stub(),
                findAll: sinon.stub().resolves({models: []})
            };
            const repository = createRepository(GiftModel);

            await repository.getActiveByMembers(['member_1'], {transacting});

            const callArg = GiftModel.findAll.firstCall.args[0];
            assert.equal(callArg.transacting, 'trx');
        });
    });
});
