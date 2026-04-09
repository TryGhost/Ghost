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
            edit: sinon.stub(),
            findOne: sinon.stub().resolves({
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

    it('returns null when no gift matches the token', async function () {
        const GiftModel = {
            add: sinon.stub(),
            edit: sinon.stub(),
            findOne: sinon.stub().resolves(null)
        };
        const repository = new GiftBookshelfRepository({GiftModel});

        const gift = await repository.getByToken('missing-token');

        assert.equal(gift, null);
    });
});
