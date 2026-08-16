import {z} from 'zod';
import {Gift} from './gift';
import {DbGift} from './gift-schema';

export const giftCodec = z.codec(DbGift, z.instanceof(Gift), {
    decode: row => new Gift({
        token: row.token,
        buyerEmail: row.buyer_email,
        buyerMemberId: row.buyer_member_id,
        redeemerMemberId: row.redeemer_member_id,
        tierId: row.tier_id,
        cadence: row.cadence,
        duration: row.duration,
        currency: row.currency,
        amount: row.amount,
        stripeCheckoutSessionId: row.stripe_checkout_session_id,
        stripePaymentIntentId: row.stripe_payment_intent_id,
        consumesAt: row.consumes_at,
        expiresAt: row.expires_at,
        status: row.status,
        purchasedAt: row.purchased_at,
        redeemedAt: row.redeemed_at,
        consumedAt: row.consumed_at,
        expiredAt: row.expired_at,
        refundedAt: row.refunded_at,
        consumesSoonReminderSentAt: row.consumes_soon_reminder_sent_at
    }),
    encode: gift => ({
        token: gift.token,
        buyer_email: gift.buyerEmail,
        buyer_member_id: gift.buyerMemberId,
        redeemer_member_id: gift.redeemerMemberId,
        tier_id: gift.tierId,
        cadence: gift.cadence,
        duration: gift.duration,
        currency: gift.currency,
        amount: gift.amount,
        stripe_checkout_session_id: gift.stripeCheckoutSessionId,
        stripe_payment_intent_id: gift.stripePaymentIntentId,
        consumes_at: gift.consumesAt,
        expires_at: gift.expiresAt,
        status: gift.status,
        purchased_at: gift.purchasedAt,
        redeemed_at: gift.redeemedAt,
        consumed_at: gift.consumedAt,
        expired_at: gift.expiredAt,
        refunded_at: gift.refundedAt,
        consumes_soon_reminder_sent_at: gift.consumesSoonReminderSentAt
    })
});

export function decodeGiftRow(input: unknown): Gift {
    return giftCodec.parse(input);
}

export function encodeGift(gift: Gift): z.output<typeof DbGift> {
    const row = z.encode(giftCodec, gift);

    // DbDate encodes to Date at runtime, but z.encode types the row as DbGift input,
    // whose date fields also accept strings and numbers. Parse to narrow it to GiftRow.
    return DbGift.parse(row);
}
