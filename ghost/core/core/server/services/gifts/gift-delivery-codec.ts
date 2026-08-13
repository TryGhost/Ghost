import {z} from 'zod';
import {GiftDelivery} from './gift-delivery';
import {DbGiftDelivery} from './gift-delivery-schema';

function withMilliseconds(date: Date | null, milliseconds: number): Date | null {
    if (!date) {
        return date;
    }

    const preciseDate = new Date(date);
    preciseDate.setUTCMilliseconds(milliseconds);
    return preciseDate;
}

export const giftDeliveryCodec = z.codec(DbGiftDelivery, z.instanceof(GiftDelivery), {
    decode: row => new GiftDelivery({
        id: row.id,
        giftId: row.gift_id,
        recipientEmail: row.recipient_email,
        status: row.status,
        startedAt: row.started_at,
        emailSentAt: row.email_sent_at,
        emailProviderMessageId: row.email_provider_message_id,
        outcome: row.outcome,
        outcomeAt: withMilliseconds(row.outcome_at, row.outcome_at_ms),
        outcomeError: row.outcome_error
    }),
    encode: delivery => ({
        id: delivery.id,
        gift_id: delivery.giftId,
        recipient_email: delivery.recipientEmail,
        status: delivery.status,
        started_at: delivery.startedAt,
        email_sent_at: delivery.emailSentAt,
        email_provider_message_id: delivery.emailProviderMessageId,
        outcome: delivery.outcome,
        outcome_at: delivery.outcomeAt,
        outcome_at_ms: delivery.outcomeAt?.getUTCMilliseconds() ?? 0,
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
