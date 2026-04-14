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
            })
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
            findOne: sinon.stub().resolves(null)
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
            findOne: sinon.stub().resolves(null)
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
            findOne: sinon.stub().resolves(existing)
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
            refundedAt: null
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
            findOne: sinon.stub().resolves(null)
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
            refundedAt: null
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
            findOne: sinon.stub()
        };
        const repository = new GiftBookshelfRepository({GiftModel});

        const result = await repository.transaction(async (transacting) => {
            assert.equal(transacting, 'trx');
            return 'done';
        });

        sinon.assert.calledOnce(GiftModel.transaction);
        assert.equal(result, 'done');
    });
});
