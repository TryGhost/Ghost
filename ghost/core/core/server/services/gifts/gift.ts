import {GIFT_EXPIRY_DAYS} from './constants';

type GiftStatus = 'purchased' | 'redeemed' | 'consumed' | 'expired' | 'refunded';
type GiftCadence = 'month' | 'year';

interface GiftData {
    token: string;
    buyerEmail: string;
    buyerMemberId: string | null;
    redeemerMemberId: string | null;
    tierId: string;
    cadence: GiftCadence;
    duration: number;
    currency: string;
    amount: number;
    stripeCheckoutSessionId: string;
    stripePaymentIntentId: string;
    consumesAt: Date | null;
    expiresAt: Date | null;
    status: GiftStatus;
    purchasedAt: Date;
    redeemedAt: Date | null;
    consumedAt: Date | null;
    expiredAt: Date | null;
    refundedAt: Date | null;
}

interface GiftPurchaseData {
    token: string;
    buyerEmail: string;
    buyerMemberId: string | null;
    tierId: string;
    cadence: GiftCadence;
    duration: number;
    currency: string;
    amount: number;
    stripeCheckoutSessionId: string;
    stripePaymentIntentId: string;
}

export class Gift {
    token: string;
    buyerEmail: string;
    buyerMemberId: string | null;
    redeemerMemberId: string | null;
    tierId: string;
    cadence: GiftCadence;
    duration: number;
    currency: string;
    amount: number;
    stripeCheckoutSessionId: string;
    stripePaymentIntentId: string;
    consumesAt: Date | null;
    expiresAt: Date | null;
    status: GiftStatus;
    purchasedAt: Date;
    redeemedAt: Date | null;
    consumedAt: Date | null;
    expiredAt: Date | null;
    refundedAt: Date | null;

    constructor(data: GiftData) {
        this.token = data.token;
        this.buyerEmail = data.buyerEmail;
        this.buyerMemberId = data.buyerMemberId;
        this.redeemerMemberId = data.redeemerMemberId;
        this.tierId = data.tierId;
        this.cadence = data.cadence;
        this.duration = data.duration;
        this.currency = data.currency;
        this.amount = data.amount;
        this.stripeCheckoutSessionId = data.stripeCheckoutSessionId;
        this.stripePaymentIntentId = data.stripePaymentIntentId;
        this.consumesAt = data.consumesAt;
        this.expiresAt = data.expiresAt;
        this.status = data.status;
        this.purchasedAt = data.purchasedAt;
        this.redeemedAt = data.redeemedAt;
        this.consumedAt = data.consumedAt;
        this.expiredAt = data.expiredAt;
        this.refundedAt = data.refundedAt;
    }

    static fromPurchase(data: GiftPurchaseData) {
        const now = new Date();
        const expiresAt = new Date(now);

        expiresAt.setDate(expiresAt.getDate() + GIFT_EXPIRY_DAYS);

        return new Gift({
            ...data,
            redeemerMemberId: null,
            consumesAt: null,
            expiresAt,
            status: 'purchased',
            purchasedAt: now,
            redeemedAt: null,
            consumedAt: null,
            expiredAt: null,
            refundedAt: null
        });
    }
}
