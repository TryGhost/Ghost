import {z} from 'zod';
import {Gift} from './gift';
import {DbGift} from './gift-schema';

export const giftCodec = z.codec(DbGift, z.instanceof(Gift), {
    decode: row => new Gift({
        token: row.token,
        buyerEmail: row.buyer_email,
        buyerMemberId: row.buyer_member_id,
        buyerName: row.buyer_name,
        deliveryMethod: row.delivery_method,
        recipientEmail: row.recipient_email,
        recipientName: row.recipient_name,
        personalMessage: row.personal_message,
        deliverAt: row.deliver_at,
        deliveryStatus: row.delivery_status,
        deliveryAttempts: row.delivery_attempts,
        deliveryAttemptAt: row.delivery_attempt_at,
        emailSentAt: row.email_sent_at,
        emailProviderMessageId: row.email_provider_message_id,
        deliveryOutcome: row.delivery_outcome,
        deliveryOutcomeAt: row.delivery_outcome_at,
        deliveryOutcomeDiagnostics: row.delivery_outcome_diagnostics,
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
        buyer_name: gift.buyerName,
        delivery_method: gift.deliveryMethod,
        recipient_email: gift.recipientEmail,
        recipient_name: gift.recipientName,
        personal_message: gift.personalMessage,
        deliver_at: gift.deliverAt,
        delivery_status: gift.deliveryStatus,
        delivery_attempts: gift.deliveryAttempts,
        delivery_attempt_at: gift.deliveryAttemptAt,
        email_sent_at: gift.emailSentAt,
        email_provider_message_id: gift.emailProviderMessageId,
        delivery_outcome: gift.deliveryOutcome,
        delivery_outcome_at: gift.deliveryOutcomeAt,
        delivery_outcome_diagnostics: gift.deliveryOutcomeDiagnostics,
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
