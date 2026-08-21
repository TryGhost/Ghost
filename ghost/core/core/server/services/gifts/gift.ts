import type { GiftCadence, GiftData, GiftDataInput, GiftStatus } from './gift-schema';

export type { GiftCadence, GiftStatus } from './gift-schema';

export type RedeemableCheckFailureReason =
  | 'payment-pending'
  | 'redeemed'
  | 'consumed'
  | 'expired'
  | 'refunded'
  | 'paid-member';
export type RedeemableCheckResult =
  | { redeemable: true }
  | { redeemable: false; reason: RedeemableCheckFailureReason };

export type ReassignableCheckFailureReason =
  | 'unredeemed'
  | 'assigned'
  | 'consumed'
  | 'expired'
  | 'refunded'
  | 'missing-consumes-at';
export type ReassignableCheckResult =
  | { reassignable: true }
  | { reassignable: false; reason: ReassignableCheckFailureReason };

export type GiftFromPurchaseData = Pick<
  GiftDataInput,
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
> & {
  purchasedAt: Date;
  expiresAt: Date;
};

export type GiftFromCheckoutData = Pick<
  GiftDataInput,
  | 'token'
  | 'buyerEmail'
  | 'buyerMemberId'
  | 'tierId'
  | 'cadence'
  | 'duration'
  | 'currency'
  | 'amount'
  | 'buyerName'
  | 'recipientName'
  | 'personalMessage'
>;

export interface CompleteGiftPurchaseData {
  buyerEmail: string | null;
  buyerMemberId: string | null;
  stripeCheckoutSessionId: string;
  stripePaymentIntentId: string;
  purchasedAt: Date;
  expiresAt: Date;
}

export class Gift implements GiftData {
  token: string;
  buyerEmail: string | null;
  buyerMemberId: string | null;
  buyerName: string | null;
  recipientName: string | null;
  personalMessage: string | null;
  redeemerMemberId: string | null;
  tierId: string;
  cadence: GiftCadence;
  duration: number;
  currency: string;
  amount: number;
  stripeCheckoutSessionId: string | null;
  stripePaymentIntentId: string | null;
  checkoutStartedAt: Date | null;
  consumesAt: Date | null;
  expiresAt: Date | null;
  status: GiftStatus;
  purchasedAt: Date | null;
  redeemedAt: Date | null;
  consumedAt: Date | null;
  expiredAt: Date | null;
  refundedAt: Date | null;
  consumesSoonReminderSentAt: Date | null;

  constructor(data: GiftDataInput) {
    this.token = data.token;
    this.buyerEmail = data.buyerEmail;
    this.buyerMemberId = data.buyerMemberId;
    this.buyerName = data.buyerName ?? null;
    this.recipientName = data.recipientName ?? null;
    this.personalMessage = data.personalMessage ?? null;
    this.redeemerMemberId = data.redeemerMemberId;
    this.tierId = data.tierId;
    this.cadence = data.cadence;
    this.duration = data.duration;
    this.currency = data.currency;
    this.amount = data.amount;
    this.stripeCheckoutSessionId = data.stripeCheckoutSessionId;
    this.stripePaymentIntentId = data.stripePaymentIntentId;
    this.checkoutStartedAt = data.checkoutStartedAt ?? null;
    this.consumesAt = data.consumesAt;
    this.purchasedAt = data.purchasedAt;
    this.expiresAt = data.expiresAt;
    this.status = data.status;
    this.redeemedAt = data.redeemedAt;
    this.consumedAt = data.consumedAt;
    this.expiredAt = data.expiredAt;
    this.refundedAt = data.refundedAt;
    this.consumesSoonReminderSentAt = data.consumesSoonReminderSentAt ?? null;
  }

  static fromPurchase(data: GiftFromPurchaseData) {
    return new Gift({
      ...data,
      redeemerMemberId: null,
      consumesAt: null,
      checkoutStartedAt: data.purchasedAt,
      expiresAt: data.expiresAt,
      status: 'purchased',
      purchasedAt: data.purchasedAt,
      redeemedAt: null,
      consumedAt: null,
      expiredAt: null,
      refundedAt: null,
      consumesSoonReminderSentAt: null,
    });
  }

  static fromCheckout(data: GiftFromCheckoutData) {
    return new Gift({
      ...data,
      redeemerMemberId: null,
      stripeCheckoutSessionId: null,
      stripePaymentIntentId: null,
      checkoutStartedAt: new Date(),
      consumesAt: null,
      expiresAt: null,
      status: 'payment_pending',
      purchasedAt: null,
      redeemedAt: null,
      consumedAt: null,
      expiredAt: null,
      refundedAt: null,
      consumesSoonReminderSentAt: null,
    });
  }

  completePurchase(data: CompleteGiftPurchaseData): Gift | null {
    if (this.status !== 'payment_pending') {
      return null;
    }

    return new Gift({
      ...this,
      ...data,
      status: 'purchased',
    });
  }

  bindCheckoutSession(checkoutSessionId: string): Gift | null {
    if (this.status !== 'payment_pending' || this.stripeCheckoutSessionId !== null) {
      return null;
    }

    return new Gift({
      ...this,
      stripeCheckoutSessionId: checkoutSessionId,
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

  // Gifts are only marked expired when the cleanup job next runs, so callers
  // that must not act on a lapsed gift compare against the deadline itself.
  // Matches the job's own `expires_at:<now` boundary.
  isPastClaimDeadline(now: Date = new Date()) {
    return this.expiresAt !== null && now > this.expiresAt;
  }

  checkRedeemable(memberStatus: string | null, now: Date = new Date()): RedeemableCheckResult {
    if (this.status === 'payment_pending') {
      return { redeemable: false, reason: 'payment-pending' };
    }

    if (this.isRedeemed()) {
      return { redeemable: false, reason: 'redeemed' };
    }

    if (this.isConsumed()) {
      return { redeemable: false, reason: 'consumed' };
    }

    if (this.isRefunded()) {
      return { redeemable: false, reason: 'refunded' };
    }

    if (this.isExpired() || this.isPastClaimDeadline(now)) {
      return { redeemable: false, reason: 'expired' };
    }

    if (memberStatus && memberStatus !== 'free') {
      return { redeemable: false, reason: 'paid-member' };
    }

    return { redeemable: true };
  }

  redeem({ memberId, redeemedAt = new Date() }: { memberId: string; redeemedAt?: Date }) {
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
      status: 'redeemed',
    });
  }

  checkReassignable(): ReassignableCheckResult {
    if (this.isRefunded()) {
      return { reassignable: false, reason: 'refunded' };
    }

    if (this.isConsumed()) {
      return { reassignable: false, reason: 'consumed' };
    }

    if (this.isExpired()) {
      return { reassignable: false, reason: 'expired' };
    }

    if (this.status !== 'redeemed' || this.redeemedAt === null) {
      return { reassignable: false, reason: 'unredeemed' };
    }

    if (this.consumesAt === null) {
      return { reassignable: false, reason: 'missing-consumes-at' };
    }

    if (this.redeemerMemberId !== null) {
      return { reassignable: false, reason: 'assigned' };
    }

    return { reassignable: true };
  }

  reassignRedeemer(newMemberId: string): Gift {
    return new Gift({
      ...this,
      redeemerMemberId: newMemberId,
    });
  }

  refund(): Gift | null {
    if (this.isRefunded()) {
      return null;
    }

    return new Gift({
      ...this,
      status: 'refunded',
      refundedAt: new Date(),
    });
  }

  consume(): Gift | null {
    if (this.isConsumed()) {
      return null;
    }

    return new Gift({
      ...this,
      status: 'consumed',
      consumedAt: new Date(),
    });
  }

  expire(): Gift | null {
    if (this.isExpired()) {
      return null;
    }

    return new Gift({
      ...this,
      status: 'expired',
      expiredAt: new Date(),
    });
  }

  remind(): Gift | null {
    if (this.consumesSoonReminderSentAt !== null) {
      return null;
    }

    return new Gift({
      ...this,
      consumesSoonReminderSentAt: new Date(),
    });
  }
}
