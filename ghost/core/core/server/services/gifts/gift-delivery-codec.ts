import {z} from 'zod';
import {GiftDelivery} from './gift-delivery';
import {DbGiftDelivery} from './gift-delivery-schema';

export const giftDeliveryCodec = z.codec(DbGiftDelivery, z.instanceof(GiftDelivery), {
    decode: row => new GiftDelivery({
        id: row.id,
        giftId: row.gift_id,
        recipientEmail: row.recipient_email,
        status: row.status,
        attempts: row.attempts,
        attemptAt: row.attempt_at,
        emailSentAt: row.email_sent_at,
        emailProviderMessageId: row.email_provider_message_id,
        outcome: row.outcome,
        outcomeAt: row.outcome_at,
        outcomeError: row.outcome_error
    }),
    encode: delivery => ({
        id: delivery.id,
        gift_id: delivery.giftId,
        recipient_email: delivery.recipientEmail,
        status: delivery.status,
        attempts: delivery.attempts,
        attempt_at: delivery.attemptAt,
        email_sent_at: delivery.emailSentAt,
        email_provider_message_id: delivery.emailProviderMessageId,
        outcome: delivery.outcome,
        outcome_at: delivery.outcomeAt,
        outcome_error: delivery.outcomeError
    })
});

export function decodeGiftDeliveryRow(input: unknown): GiftDelivery {
    return giftDeliveryCodec.parse(input);
}

export function encodeGiftDelivery(delivery: GiftDelivery): z.output<typeof DbGiftDelivery> {
    const row = z.encode(giftDeliveryCodec, delivery);

    return DbGiftDelivery.parse(row);
}
