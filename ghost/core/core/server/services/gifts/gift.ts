import {GIFT_EXPIRY_DAYS} from './constants';
import type {GiftCadence, GiftData, GiftDeliveryMethod, GiftDeliveryOutcome, GiftDeliveryStatus, GiftStatus} from './gift-schema';

export type {GiftCadence, GiftStatus} from './gift-schema';

export type RedeemableCheckFailureReason = 'redeemed' | 'consumed' | 'expired' | 'refunded' | 'paid-member';
export type RedeemableCheckResult =
    | {redeemable: true}
    | {redeemable: false; reason: RedeemableCheckFailureReason};

export type ReassignableCheckFailureReason = 'unredeemed' | 'assigned' | 'consumed' | 'expired' | 'refunded' | 'missing-consumes-at';
export type ReassignableCheckResult =
    | {reassignable: true}
    | {reassignable: false; reason: ReassignableCheckFailureReason};

export type GiftFromPurchaseData = Pick<GiftData,
    | 'token'
    | 'buyerEmail'
    | 'buyerMemberId'
    | 'tierId'
    | 'cadence'
    | 'duration'
    | 'currency'
    | 'amount'
    | 'stripeCheckoutSessionId'
    | 'stripePaymentIntentId'
> & Partial<Pick<GiftData,
    | 'buyerName'
    | 'deliveryMethod'
    | 'recipientEmail'
    | 'recipientName'
    | 'personalMessage'
    | 'deliverAt'
>>;

type GiftConstructorData = Omit<GiftData,
    | 'buyerName'
    | 'deliveryMethod'
    | 'recipientEmail'
    | 'recipientName'
    | 'personalMessage'
    | 'deliverAt'
    | 'deliveryStatus'
    | 'deliveryAttempts'
    | 'deliveryNextAttemptAt'
    | 'emailSentAt'
    | 'emailProviderMessageId'
    | 'deliveryOutcome'
    | 'deliveryOutcomeAt'
    | 'deliveryOutcomeDiagnostics'
> & Partial<Pick<GiftData,
    | 'buyerName'
    | 'deliveryMethod'
    | 'recipientEmail'
    | 'recipientName'
    | 'personalMessage'
    | 'deliverAt'
    | 'deliveryStatus'
    | 'deliveryAttempts'
    | 'deliveryNextAttemptAt'
    | 'emailSentAt'
    | 'emailProviderMessageId'
    | 'deliveryOutcome'
    | 'deliveryOutcomeAt'
    | 'deliveryOutcomeDiagnostics'
>>;

export class Gift implements GiftData {
    token: string;
    buyerEmail: string;
    buyerMemberId: string | null;
    buyerName: string | null;
    deliveryMethod: GiftDeliveryMethod;
    recipientEmail: string | null;
    recipientName: string | null;
    personalMessage: string | null;
    deliverAt: Date | null;
    deliveryStatus: GiftDeliveryStatus;
    deliveryAttempts: number;
    deliveryNextAttemptAt: Date | null;
    emailSentAt: Date | null;
    emailProviderMessageId: string | null;
    deliveryOutcome: GiftDeliveryOutcome;
    deliveryOutcomeAt: Date | null;
    deliveryOutcomeDiagnostics: string | null;
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
    consumesSoonReminderSentAt: Date | null;

    constructor(data: GiftConstructorData) {
        this.token = data.token;
        this.buyerEmail = data.buyerEmail;
        this.buyerMemberId = data.buyerMemberId;
        this.buyerName = data.buyerName ?? null;
        this.deliveryMethod = data.deliveryMethod ?? 'link';
        this.recipientEmail = data.recipientEmail ?? null;
        this.recipientName = data.recipientName ?? null;
        this.personalMessage = data.personalMessage ?? null;
        this.deliverAt = data.deliverAt ?? null;
        this.deliveryStatus = data.deliveryStatus ?? 'pending';
        this.deliveryAttempts = data.deliveryAttempts ?? 0;
        this.deliveryNextAttemptAt = data.deliveryNextAttemptAt ?? null;
        this.emailSentAt = data.emailSentAt ?? null;
        this.emailProviderMessageId = data.emailProviderMessageId ?? null;
        this.deliveryOutcome = data.deliveryOutcome ?? 'unknown';
        this.deliveryOutcomeAt = data.deliveryOutcomeAt ?? null;
        this.deliveryOutcomeDiagnostics = data.deliveryOutcomeDiagnostics ?? null;
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
        this.consumesSoonReminderSentAt = data.consumesSoonReminderSentAt;
    }

    static fromPurchase(data: GiftFromPurchaseData) {
        const now = new Date();
        const expiresAt = new Date(now);

        expiresAt.setDate(expiresAt.getDate() + GIFT_EXPIRY_DAYS);

        return new Gift({
            ...data,
            buyerName: data.buyerName ?? null,
            deliveryMethod: data.deliveryMethod ?? 'link',
            recipientEmail: data.recipientEmail ?? null,
            recipientName: data.recipientName ?? null,
            personalMessage: data.personalMessage ?? null,
            deliverAt: data.deliverAt ?? null,
            deliveryStatus: 'pending',
            deliveryAttempts: 0,
            deliveryNextAttemptAt: null,
            emailSentAt: null,
            emailProviderMessageId: null,
            deliveryOutcome: 'unknown',
            deliveryOutcomeAt: null,
            deliveryOutcomeDiagnostics: null,
            redeemerMemberId: null,
            consumesAt: null,
            expiresAt,
            status: 'purchased',
            purchasedAt: now,
            redeemedAt: null,
            consumedAt: null,
            expiredAt: null,
            refundedAt: null,
            consumesSoonReminderSentAt: null
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
