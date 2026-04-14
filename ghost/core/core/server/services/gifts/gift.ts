import {GIFT_EXPIRY_DAYS} from './constants';

export type GiftStatus = 'purchased' | 'redeemed' | 'consumed' | 'expired' | 'refunded';
export type GiftCadence = 'month' | 'year';

export type RedeemableCheckFailureReason = 'redeemed' | 'consumed' | 'expired' | 'refunded' | 'paid-member';
export type RedeemableCheckResult =
    | {redeemable: true}
    | {redeemable: false; reason: RedeemableCheckFailureReason};

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
    expiresAt: Date;
    status: GiftStatus;
    purchasedAt: Date;
    redeemedAt: Date | null;
    consumedAt: Date | null;
    expiredAt: Date | null;
    refundedAt: Date | null;
}

export interface GiftFromPurchaseData {
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
    expiresAt: Date;
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

    static fromPurchase(data: GiftFromPurchaseData) {
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

    isRedeemed() {
        return this.redeemedAt !== null;
    }

    isExpired() {
        return this.expiredAt !== null;
    }

    isRefunded() {
        return this.refundedAt !== null;
    }

    isConsumed() {
        return this.consumedAt !== null;
    }

    checkRedeemable(memberStatus: string | null): RedeemableCheckResult {
        if (this.isRedeemed()) {
            return {redeemable: false, reason: 'redeemed'};
        }

        if (this.isConsumed()) {
            return {redeemable: false, reason: 'consumed'};
        }

        if (this.isExpired()) {
            return {redeemable: false, reason: 'expired'};
        }

        if (this.isRefunded()) {
            return {redeemable: false, reason: 'refunded'};
        }

        if (memberStatus && memberStatus !== 'free') {
            return {redeemable: false, reason: 'paid-member'};
        }

        return {redeemable: true};
    }

    redeem({memberId, redeemedAt = new Date()}: {memberId: string; redeemedAt?: Date}) {
        const consumesAt = new Date(redeemedAt);

        if (this.cadence === 'year') {
            consumesAt.setFullYear(consumesAt.getFullYear() + this.duration);
        } else {
            consumesAt.setMonth(consumesAt.getMonth() + this.duration);
        }

        return new Gift({
            ...this,
            redeemerMemberId: memberId,
            redeemedAt,
            consumesAt,
            status: 'redeemed'
        });
    }

    refund(): Gift | null {
        if (this.isRefunded()) {
            return null;
        }

        return new Gift({
            ...this,
            status: 'refunded',
            refundedAt: new Date()
        });
    }
}
