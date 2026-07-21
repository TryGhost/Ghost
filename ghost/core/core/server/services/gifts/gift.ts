import {GIFT_EXPIRY_DAYS} from './constants';

export type GiftStatus = 'purchased' | 'redeemed' | 'consumed' | 'expired' | 'refunded';
export type GiftCadence = 'month' | 'year';

export type RedeemableCheckFailureReason = 'redeemed' | 'consumed' | 'expired' | 'refunded' | 'paid-member';
export type RedeemableCheckResult =
    | {redeemable: true}
    | {redeemable: false; reason: RedeemableCheckFailureReason};

export type ReassignableCheckFailureReason = 'unredeemed' | 'assigned' | 'consumed' | 'expired' | 'refunded' | 'missing-consumes-at';
export type ReassignableCheckResult =
    | {reassignable: true}
    | {reassignable: false; reason: ReassignableCheckFailureReason};

interface GiftData {
    token: string;
    buyerEmail: string;
    buyerMemberId: string | null;
    buyerName: string | null;
    recipientEmail: string | null;
    message: string | null;
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
    deliverAt: Date | null;
    deliveredAt: Date | null;
    status: GiftStatus;
    purchasedAt: Date;
    redeemedAt: Date | null;
    consumedAt: Date | null;
    expiredAt: Date | null;
    refundedAt: Date | null;
    consumesSoonReminderSentAt: Date | null;
}

export interface GiftFromPurchaseData {
    token: string;
    buyerEmail: string;
    buyerMemberId: string | null;
    buyerName: string | null;
    recipientEmail: string | null;
    message: string | null;
    tierId: string;
    cadence: GiftCadence;
    duration: number;
    currency: string;
    amount: number;
    stripeCheckoutSessionId: string;
    stripePaymentIntentId: string;
    deliverAt: Date | null;
}

export class Gift {
    token: string;
    buyerEmail: string;
    buyerMemberId: string | null;
    buyerName: string | null;
    recipientEmail: string | null;
    message: string | null;
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
    deliverAt: Date | null;
    deliveredAt: Date | null;
    status: GiftStatus;
    purchasedAt: Date;
    redeemedAt: Date | null;
    consumedAt: Date | null;
    expiredAt: Date | null;
    refundedAt: Date | null;
    consumesSoonReminderSentAt: Date | null;

    constructor(data: GiftData) {
        this.token = data.token;
        this.buyerEmail = data.buyerEmail;
        this.buyerMemberId = data.buyerMemberId;
        this.buyerName = data.buyerName;
        this.recipientEmail = data.recipientEmail;
        this.message = data.message;
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
        this.deliverAt = data.deliverAt;
        this.deliveredAt = data.deliveredAt;
        this.status = data.status;
        this.purchasedAt = data.purchasedAt;
        this.redeemedAt = data.redeemedAt;
        this.consumedAt = data.consumedAt;
        this.expiredAt = data.expiredAt;
        this.refundedAt = data.refundedAt;
        this.consumesSoonReminderSentAt = data.consumesSoonReminderSentAt;
    }

    static fromPurchase(data: GiftFromPurchaseData) {
        const now = new Date();

        // The expiry clock starts when the gift reaches the recipient — a gift
        // scheduled for delivery months out shouldn't burn its redemption
        // window while it waits to be sent
        const deliverAt = data.deliverAt && data.deliverAt.getTime() > now.getTime() ? data.deliverAt : null;
        const expiresAt = new Date(deliverAt ?? now);

        expiresAt.setDate(expiresAt.getDate() + GIFT_EXPIRY_DAYS);

        return new Gift({
            ...data,
            deliverAt,
            redeemerMemberId: null,
            consumesAt: null,
            expiresAt,
            status: 'purchased',
            purchasedAt: now,
            redeemedAt: null,
            consumedAt: null,
            expiredAt: null,
            refundedAt: null,
            deliveredAt: null,
            consumesSoonReminderSentAt: null
        });
    }

    hasPendingDelivery(): boolean {
        return this.status === 'purchased'
            && this.recipientEmail !== null
            && this.deliveredAt === null;
    }

    deliver(): Gift | null {
        if (!this.hasPendingDelivery()) {
            return null;
        }

        return new Gift({
            ...this,
            deliveredAt: new Date()
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

    checkReassignable(): ReassignableCheckResult {
        if (this.isRefunded()) {
            return {reassignable: false, reason: 'refunded'};
        }

        if (this.isConsumed()) {
            return {reassignable: false, reason: 'consumed'};
        }

        if (this.isExpired()) {
            return {reassignable: false, reason: 'expired'};
        }

        if (this.status !== 'redeemed' || this.redeemedAt === null) {
            return {reassignable: false, reason: 'unredeemed'};
        }

        if (this.consumesAt === null) {
            return {reassignable: false, reason: 'missing-consumes-at'};
        }

        if (this.redeemerMemberId !== null) {
            return {reassignable: false, reason: 'assigned'};
        }

        return {reassignable: true};
    }

    reassignRedeemer(newMemberId: string): Gift {
        return new Gift({
            ...this,
            redeemerMemberId: newMemberId
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

    consume(): Gift | null {
        if (this.isConsumed()) {
            return null;
        }

        return new Gift({
            ...this,
            status: 'consumed',
            consumedAt: new Date()
        });
    }

    expire(): Gift | null {
        if (this.isExpired()) {
            return null;
        }

        return new Gift({
            ...this,
            status: 'expired',
            expiredAt: new Date()
        });
    }

    remind(): Gift | null {
        if (this.consumesSoonReminderSentAt !== null) {
            return null;
        }

        return new Gift({
            ...this,
            consumesSoonReminderSentAt: new Date()
        });
    }
}
