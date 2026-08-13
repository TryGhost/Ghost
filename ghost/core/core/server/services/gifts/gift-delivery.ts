import ObjectID from 'bson-objectid';
import type {
    GiftDeliveryData,
    GiftDeliveryDataInput,
    GiftDeliveryOutcome,
    GiftDeliveryStatus
} from './gift-delivery-schema';

export class GiftDelivery implements GiftDeliveryData {
    id: string;
    giftId: string;
    recipientEmail: string;
    status: GiftDeliveryStatus;
    startedAt: Date | null;
    emailSentAt: Date | null;
    emailProviderMessageId: string | null;
    outcome: GiftDeliveryOutcome;
    outcomeAt: Date | null;
    outcomeError: string | null;

    constructor(data: GiftDeliveryDataInput) {
        this.id = data.id;
        this.giftId = data.giftId;
        this.recipientEmail = data.recipientEmail;
        this.status = data.status ?? 'pending';
        this.startedAt = data.startedAt ?? null;
        this.emailSentAt = data.emailSentAt ?? null;
        this.emailProviderMessageId = data.emailProviderMessageId ?? null;
        this.outcome = data.outcome ?? 'unknown';
        this.outcomeAt = data.outcomeAt ?? null;
        this.outcomeError = data.outcomeError ?? null;
    }

    static fromPurchase({giftId, recipientEmail}: {giftId: string; recipientEmail: string}) {
        return new GiftDelivery({
            id: new ObjectID().toHexString(),
            giftId,
            recipientEmail
        });
    }
}
