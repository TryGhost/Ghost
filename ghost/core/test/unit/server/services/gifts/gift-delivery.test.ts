import assert from 'node:assert/strict';
import ObjectID from 'bson-objectid';
import {decodeGiftDeliveryRow, encodeGiftDelivery} from '../../../../../core/server/services/gifts/gift-delivery-codec';

describe('Gift delivery codec', function () {
    it('round-trips the persisted delivery row through the codec', function () {
        const row = {
            id: new ObjectID().toHexString(),
            gift_id: 'gift_1',
            recipient_email: 'recipient@example.com',
            status: 'sent',
            started_at: null,
            email_sent_at: '2026-08-11T11:00:00.000Z',
            email_provider_message_id: 'provider-123'
        } as const;

        const delivery = decodeGiftDeliveryRow(row);

        assert.ok(delivery.emailSentAt instanceof Date);
        assert.deepEqual(encodeGiftDelivery(delivery), {
            ...row,
            email_sent_at: new Date(row.email_sent_at)
        });
    });

    it('rejects an invalid persisted state', function () {
        assert.throws(() => decodeGiftDeliveryRow({
            id: new ObjectID().toHexString(),
            gift_id: 'gift_1',
            recipient_email: 'recipient@example.com',
            status: 'waiting'
        }), {name: 'ZodError'});
    });
});
