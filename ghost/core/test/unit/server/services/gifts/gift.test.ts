import assert from 'node:assert/strict';
import {Gift, type GiftFromPurchaseData} from '../../../../../core/server/services/gifts/gift';
import {GIFT_EXPIRY_DAYS} from '../../../../../core/server/services/gifts/constants';

describe('Gift', function () {
    const purchaseData: GiftFromPurchaseData = {
        token: 'abc-123',
        buyerEmail: 'buyer@example.com',
        buyerMemberId: 'member_1',
        tierId: 'tier_1',
        cadence: 'year',
        duration: 1,
        currency: 'usd',
        amount: 5000,
        stripeCheckoutSessionId: 'cs_123',
        stripePaymentIntentId: 'pi_456'
    };

    describe('fromPurchase', function () {
        it('sets status to purchased', function () {
            const gift = Gift.fromPurchase(purchaseData);

            assert.equal(gift.status, 'purchased');
        });

        it('sets purchasedAt to now', function () {
            const before = new Date();
            const gift = Gift.fromPurchase(purchaseData);
            const after = new Date();

            assert.ok(gift.purchasedAt >= before);
            assert.ok(gift.purchasedAt <= after);
        });

        it('sets expiresAt to GIFT_EXPIRY_DAYS after purchasedAt', function () {
            const gift = Gift.fromPurchase(purchaseData);
            const daysDiff = Math.round(
                (gift.expiresAt!.getTime() - gift.purchasedAt.getTime()) / (1000 * 60 * 60 * 24)
            );

            assert.equal(daysDiff, GIFT_EXPIRY_DAYS);
        });

        it('sets null defaults for redemption fields', function () {
            const gift = Gift.fromPurchase(purchaseData);

            assert.equal(gift.redeemerMemberId, null);
            assert.equal(gift.consumesAt, null);
            assert.equal(gift.redeemedAt, null);
            assert.equal(gift.consumedAt, null);
            assert.equal(gift.expiredAt, null);
            assert.equal(gift.refundedAt, null);
        });

        it('passes through purchase data', function () {
            const gift = Gift.fromPurchase(purchaseData);

            assert.equal(gift.token, 'abc-123');
            assert.equal(gift.buyerEmail, 'buyer@example.com');
            assert.equal(gift.buyerMemberId, 'member_1');
            assert.equal(gift.tierId, 'tier_1');
            assert.equal(gift.cadence, 'year');
            assert.equal(gift.duration, 1);
            assert.equal(gift.currency, 'usd');
            assert.equal(gift.amount, 5000);
            assert.equal(gift.stripeCheckoutSessionId, 'cs_123');
            assert.equal(gift.stripePaymentIntentId, 'pi_456');
        });
    });

    describe('redeemability', function () {
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

        it('is redeemable when it has not been redeemed, consumed, expired, or refunded', function () {
            const gift = buildGift();

            assert.deepEqual(gift.checkRedeemable(), {redeemable: true});
        });

        it('is not redeemable when it has already been redeemed', function () {
            const gift = buildGift({
                redeemedAt: new Date('2026-02-01T00:00:00.000Z')
            });

            assert.deepEqual(gift.checkRedeemable(), {redeemable: false, reason: 'redeemed'});
        });

        it('is not redeemable when it has already been consumed', function () {
            const gift = buildGift({
                consumedAt: new Date('2026-02-01T00:00:00.000Z')
            });

            assert.deepEqual(gift.checkRedeemable(), {redeemable: false, reason: 'consumed'});
        });

        it('is not redeemable when it has already been expired', function () {
            const gift = buildGift({
                expiredAt: new Date('2026-02-01T00:00:00.000Z')
            });

            assert.deepEqual(gift.checkRedeemable(), {redeemable: false, reason: 'expired'});
        });

        it('is not redeemable when it has been refunded', function () {
            const gift = buildGift({
                refundedAt: new Date('2026-02-01T00:00:00.000Z')
            });

            assert.deepEqual(gift.checkRedeemable(), {redeemable: false, reason: 'refunded'});
        });
    });
});
