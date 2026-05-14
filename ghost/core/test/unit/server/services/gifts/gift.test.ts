import assert from 'node:assert/strict';
import {Gift, type GiftFromPurchaseData} from '../../../../../core/server/services/gifts/gift';
import {GIFT_EXPIRY_DAYS} from '../../../../../core/server/services/gifts/constants';
import {buildGift} from './utils';

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
                (gift.expiresAt.getTime() - gift.purchasedAt.getTime()) / (1000 * 60 * 60 * 24)
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
            assert.equal(gift.consumesSoonReminderSentAt, null);
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

    describe('checkRedeemable', function () {
        const testCases = [
            {
                name: 'redeemed',
                overrides: {
                    redeemedAt: new Date('2026-02-01T00:00:00.000Z')
                },
                memberStatus: null,
                reason: 'redeemed'
            },
            {
                name: 'consumed',
                overrides: {
                    consumedAt: new Date('2026-02-01T00:00:00.000Z')
                },
                memberStatus: null,
                reason: 'consumed'
            },
            {
                name: 'expired',
                overrides: {
                    expiredAt: new Date('2026-02-01T00:00:00.000Z')
                },
                memberStatus: null,
                reason: 'expired'
            },
            {
                name: 'refunded',
                overrides: {
                    refundedAt: new Date('2026-02-01T00:00:00.000Z')
                },
                memberStatus: null,
                reason: 'refunded'
            },
            {
                name: 'paid-member for a paid member',
                overrides: {},
                memberStatus: 'paid',
                reason: 'paid-member'
            },
            {
                name: 'paid-member for a comped member',
                overrides: {},
                memberStatus: 'comped',
                reason: 'paid-member'
            }
        ];

        it('returns the gift when it has not been redeemed, consumed, expired, or refunded', function () {
            const gift = buildGift();
            const result = gift.checkRedeemable(null);

            assert.deepEqual(result, {redeemable: true});
        });

        it('returns the gift for a free member', function () {
            const gift = buildGift();
            const result = gift.checkRedeemable('free');

            assert.deepEqual(result, {redeemable: true});
        });

        for (const {name, overrides, memberStatus, reason} of testCases) {
            it(`returns ${reason} error when state is ${name}`, function () {
                const gift = buildGift(overrides);
                const result = gift.checkRedeemable(memberStatus);

                assert.deepEqual(result, {redeemable: false, reason});
            });
        }
    });

    describe('consume', function () {
        it('returns a consumed gift without mutating the original gift', function () {
            const gift = buildGift({
                status: 'redeemed',
                redeemerMemberId: 'member_2',
                redeemedAt: new Date('2026-04-11T12:00:00.000Z'),
                consumesAt: new Date('2027-04-11T12:00:00.000Z')
            });
            const before = new Date();
            const consumed = gift.consume();
            const after = new Date();

            assert.notEqual(consumed, gift);
            assert.equal(gift.status, 'redeemed');
            assert.equal(gift.consumedAt, null);
            assert.equal(consumed!.status, 'consumed');
            assert.ok(consumed!.consumedAt! >= before);
            assert.ok(consumed!.consumedAt! <= after);
        });

        it('preserves all other fields', function () {
            const gift = buildGift({
                status: 'redeemed',
                redeemerMemberId: 'member_2',
                redeemedAt: new Date('2026-04-11T12:00:00.000Z'),
                consumesAt: new Date('2027-04-11T12:00:00.000Z')
            });
            const consumed = gift.consume();

            assert.ok(consumed);
            assert.equal(consumed!.token, gift.token);
            assert.equal(consumed!.redeemerMemberId, gift.redeemerMemberId);
            assert.equal(consumed!.tierId, gift.tierId);
            assert.equal(consumed!.consumesAt?.toISOString(), gift.consumesAt?.toISOString());
        });

        it('returns null when the gift is already consumed', function () {
            const gift = buildGift({
                status: 'consumed',
                consumedAt: new Date('2026-04-12T00:00:00.000Z')
            });

            assert.equal(gift.consume(), null);
        });
    });

    describe('redeem', function () {
        it('returns a redeemed gift for the member without mutating the original gift', function () {
            const gift = buildGift();
            const redeemedAt = new Date('2026-04-11T12:00:00.000Z');
            const redeemed = gift.redeem({
                memberId: 'member_2',
                redeemedAt
            });

            assert.notEqual(redeemed, gift);
            assert.equal(gift.redeemerMemberId, null);
            assert.equal(gift.redeemedAt, null);
            assert.equal(gift.status, 'purchased');
            assert.equal(redeemed.redeemerMemberId, 'member_2');
            assert.equal(redeemed.redeemedAt, redeemedAt);
            assert.equal(redeemed.status, 'redeemed');
            assert.equal(redeemed.consumesAt?.toISOString(), '2027-04-11T12:00:00.000Z');
        });

        it('calculates monthly consumption dates from the redemption time', function () {
            const gift = buildGift({
                cadence: 'month',
                duration: 3
            });

            const redeemed = gift.redeem({
                memberId: 'member_2',
                redeemedAt: new Date('2026-04-11T12:00:00.000Z')
            });

            assert.equal(redeemed.consumesAt?.toISOString(), '2026-07-11T12:00:00.000Z');
        });

        it('keeps month-end redemption math stable for shorter months', function () {
            const gift = buildGift({
                cadence: 'month',
                duration: 1
            });

            const redeemed = gift.redeem({
                memberId: 'member_2',
                redeemedAt: new Date('2026-01-31T12:00:00.000Z')
            });

            assert.equal(redeemed.consumesAt?.toISOString(), '2026-03-03T12:00:00.000Z');
        });

        it('keeps yearly redemption math stable across leap years', function () {
            const gift = buildGift({
                cadence: 'year',
                duration: 1
            });

            const redeemed = gift.redeem({
                memberId: 'member_2',
                redeemedAt: new Date('2024-02-29T12:00:00.000Z')
            });

            assert.equal(redeemed.consumesAt?.toISOString(), '2025-03-01T12:00:00.000Z');
        });
    });

    describe('expire', function () {
        it('returns an expired gift without mutating the original', function () {
            const gift = buildGift();
            const before = new Date();

            const expired = gift.expire();

            const after = new Date();

            assert.ok(expired);
            assert.notEqual(expired, gift);
            assert.equal(gift.status, 'purchased');
            assert.equal(gift.expiredAt, null);
            assert.equal(expired.status, 'expired');
            assert.ok(expired.expiredAt);
            assert.ok(expired.expiredAt >= before);
            assert.ok(expired.expiredAt <= after);
        });

        it('returns null if already expired', function () {
            const gift = buildGift({
                status: 'expired',
                expiredAt: new Date('2026-02-01T00:00:00.000Z')
            });

            const result = gift.expire();

            assert.equal(result, null);
        });
    });

    describe('refund', function () {
        it('returns a refunded gift without mutating the original', function () {
            const gift = buildGift();
            const before = new Date();

            const refunded = gift.refund();

            const after = new Date();

            assert.ok(refunded);
            assert.notEqual(refunded, gift);
            assert.equal(gift.status, 'purchased');
            assert.equal(gift.refundedAt, null);
            assert.equal(refunded.status, 'refunded');
            assert.ok(refunded.refundedAt);
            assert.ok(refunded.refundedAt >= before);
            assert.ok(refunded.refundedAt <= after);
        });

        it('returns null if already refunded', function () {
            const gift = buildGift({
                status: 'refunded',
                refundedAt: new Date('2026-02-01T00:00:00.000Z')
            });

            const result = gift.refund();

            assert.equal(result, null);
        });
    });

    describe('remind', function () {
        it('returns a gift with consumesSoonReminderSentAt set without mutating the original', function () {
            const gift = buildGift({
                status: 'redeemed',
                redeemerMemberId: 'member_2',
                redeemedAt: new Date('2026-04-11T12:00:00.000Z'),
                consumesAt: new Date('2027-04-11T12:00:00.000Z')
            });
            const before = new Date();

            const reminded = gift.remind();

            const after = new Date();

            assert.ok(reminded);
            assert.notEqual(reminded, gift);
            assert.equal(gift.consumesSoonReminderSentAt, null);
            assert.ok(reminded.consumesSoonReminderSentAt);
            assert.ok(reminded.consumesSoonReminderSentAt >= before);
            assert.ok(reminded.consumesSoonReminderSentAt <= after);
        });

        it('returns null if already reminded', function () {
            const gift = buildGift({
                status: 'redeemed',
                redeemerMemberId: 'member_2',
                redeemedAt: new Date('2026-04-11T12:00:00.000Z'),
                consumesAt: new Date('2027-04-11T12:00:00.000Z'),
                consumesSoonReminderSentAt: new Date('2027-04-01T12:00:00.000Z')
            });

            const result = gift.remind();

            assert.equal(result, null);
        });
    });

    describe('checkReassignable', function () {
        // An orphaned gift is one that was redeemed but whose redeemer member was later
        // deleted (the FK is SET NULL on delete). These should be reassignable on re-import.
        function orphanedGift() {
            return buildGift({
                status: 'redeemed',
                redeemerMemberId: null,
                redeemedAt: new Date('2026-04-11T12:00:00.000Z'),
                consumesAt: new Date('2027-04-11T12:00:00.000Z')
            });
        }

        it('returns reassignable=true for a redeemed gift whose redeemer is null', function () {
            const gift = orphanedGift();

            assert.deepEqual(gift.checkReassignable(), {reassignable: true});
        });

        it('returns unredeemed for a purchased (never redeemed) gift', function () {
            const gift = buildGift({status: 'purchased'});

            assert.deepEqual(gift.checkReassignable(), {reassignable: false, reason: 'unredeemed'});
        });

        it('returns assigned when redeemer is set', function () {
            const gift = buildGift({
                status: 'redeemed',
                redeemerMemberId: 'member_2',
                redeemedAt: new Date('2026-04-11T12:00:00.000Z'),
                consumesAt: new Date('2027-04-11T12:00:00.000Z')
            });

            assert.deepEqual(gift.checkReassignable(), {reassignable: false, reason: 'assigned'});
        });

        it('returns consumed when consumedAt is set', function () {
            const gift = buildGift({
                status: 'consumed',
                redeemerMemberId: null,
                redeemedAt: new Date('2026-04-11T12:00:00.000Z'),
                consumesAt: new Date('2027-04-11T12:00:00.000Z'),
                consumedAt: new Date('2027-04-11T12:00:00.000Z')
            });

            assert.deepEqual(gift.checkReassignable(), {reassignable: false, reason: 'consumed'});
        });

        it('returns expired when expiredAt is set', function () {
            const gift = buildGift({
                status: 'expired',
                redeemerMemberId: null,
                expiredAt: new Date('2027-04-11T12:00:00.000Z')
            });

            assert.deepEqual(gift.checkReassignable(), {reassignable: false, reason: 'expired'});
        });

        it('returns refunded when refundedAt is set', function () {
            const gift = buildGift({
                status: 'refunded',
                redeemerMemberId: null,
                refundedAt: new Date('2027-04-11T12:00:00.000Z')
            });

            assert.deepEqual(gift.checkReassignable(), {reassignable: false, reason: 'refunded'});
        });

        it('returns missing-consumes-at when consumesAt is null on a redeemed gift', function () {
            const gift = buildGift({
                status: 'redeemed',
                redeemerMemberId: null,
                redeemedAt: new Date('2026-04-11T12:00:00.000Z'),
                consumesAt: null
            });

            assert.deepEqual(gift.checkReassignable(), {reassignable: false, reason: 'missing-consumes-at'});
        });
    });

    describe('reassignRedeemer', function () {
        it('returns a new Gift with the supplied redeemer id', function () {
            const gift = buildGift({
                status: 'redeemed',
                redeemerMemberId: null,
                redeemedAt: new Date('2026-04-11T12:00:00.000Z'),
                consumesAt: new Date('2027-04-11T12:00:00.000Z')
            });

            const reassigned = gift.reassignRedeemer('member_new');

            assert.equal(reassigned.redeemerMemberId, 'member_new');
            // Other lifecycle fields should be untouched
            assert.equal(reassigned.status, 'redeemed');
            assert.deepEqual(reassigned.redeemedAt, gift.redeemedAt);
            assert.deepEqual(reassigned.consumesAt, gift.consumesAt);
        });
    });
});
