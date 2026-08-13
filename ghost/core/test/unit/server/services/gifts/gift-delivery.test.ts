import assert from 'node:assert/strict';
import ObjectID from 'bson-objectid';
import {GiftDelivery} from '../../../../../core/server/services/gifts/gift-delivery';
import {decodeGiftDeliveryRow, encodeGiftDelivery} from '../../../../../core/server/services/gifts/gift-delivery-codec';

describe('GiftDelivery', function () {
    it('creates a pending email delivery for a purchased gift', function () {
        const delivery = GiftDelivery.fromPurchase({
            giftId: 'gift_1',
            recipientEmail: 'recipient@example.com'
        });

        assert.equal(ObjectID.isValid(delivery.id), true);
        assert.equal(delivery.giftId, 'gift_1');
        assert.equal(delivery.recipientEmail, 'recipient@example.com');
        assert.equal(delivery.status, 'pending');
        assert.equal(delivery.startedAt, null);
        assert.equal(delivery.outcome, 'unknown');
    });

    it('round-trips the persisted delivery row through the codec', function () {
        const row = {
            id: new ObjectID().toHexString(),
            gift_id: 'gift_1',
            recipient_email: 'recipient@example.com',
            status: 'sent',
            started_at: null,
            email_sent_at: '2026-08-11T11:00:00.000Z',
            email_provider_message_id: 'provider-123',
            outcome: 'delivered',
            outcome_at: '2026-08-11T11:01:00.000Z',
            outcome_at_ms: 123,
            outcome_error: null
        } as const;

        const delivery = decodeGiftDeliveryRow(row);

        assert.ok(delivery.emailSentAt instanceof Date);
        assert.ok(delivery.outcomeAt instanceof Date);
        assert.deepEqual(encodeGiftDelivery(delivery), {
            ...row,
            email_sent_at: new Date(row.email_sent_at),
            outcome_at: new Date('2026-08-11T11:01:00.123Z')
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
