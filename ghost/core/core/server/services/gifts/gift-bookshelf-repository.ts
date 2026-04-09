import {Gift, type GiftCadence, type GiftStatus} from './gift';
import type {GiftRepository} from './gift-repository';

type BookshelfDocument<T> = {
    toJSON(): T;
};

type BookshelfModel<T> = {
    add(data: Partial<T>, unfilteredOptions?: unknown): Promise<T>;
    findOne(data: Record<string, unknown>, unfilteredOptions?: unknown): Promise<BookshelfDocument<T> | null>;
};

type GiftRow = {
    token: string;
    buyer_email: string;
    buyer_member_id: string | null;
    redeemer_member_id: string | null;
    tier_id: string;
    cadence: GiftCadence;
    duration: number;
    currency: string;
    amount: number;
    stripe_checkout_session_id: string;
    stripe_payment_intent_id: string;
    consumes_at: Date | null;
    expires_at: Date;
    status: GiftStatus;
    purchased_at: Date;
    redeemed_at: Date | null;
    consumed_at: Date | null;
    expired_at: Date | null;
    refunded_at: Date | null;
};

type GiftBookshelfModel = BookshelfModel<GiftRow>;

export class GiftBookshelfRepository implements GiftRepository {
    private readonly model: GiftBookshelfModel;

    constructor({GiftModel}: {GiftModel: GiftBookshelfModel}) {
        this.model = GiftModel;
    }

    async existsByCheckoutSessionId(checkoutSessionId: string): Promise<boolean> {
        const existing = await this.model.findOne({
            stripe_checkout_session_id: checkoutSessionId
        }, {require: false});

        return !!existing;
    }

    async create(gift: Gift) {
        await this.model.add({
            token: gift.token,
            buyer_email: gift.buyerEmail,
            buyer_member_id: gift.buyerMemberId,
            redeemer_member_id: gift.redeemerMemberId,
            tier_id: gift.tierId,
            cadence: gift.cadence,
            duration: gift.duration,
            currency: gift.currency,
            amount: gift.amount,
            stripe_checkout_session_id: gift.stripeCheckoutSessionId,
            stripe_payment_intent_id: gift.stripePaymentIntentId,
            consumes_at: gift.consumesAt,
            expires_at: gift.expiresAt,
            status: gift.status,
            purchased_at: gift.purchasedAt,
            redeemed_at: gift.redeemedAt,
            consumed_at: gift.consumedAt,
            expired_at: gift.expiredAt,
            refunded_at: gift.refundedAt
        });
    }

    async getByToken(token: string): Promise<Gift | null> {
        const model = await this.model.findOne({
            token
        }, {require: false});

        if (!model) {
            return null;
        }

        const json = model.toJSON();

        return new Gift({
            token: json.token,
            buyerEmail: json.buyer_email,
            buyerMemberId: json.buyer_member_id,
            redeemerMemberId: json.redeemer_member_id,
            tierId: json.tier_id,
            cadence: json.cadence,
            duration: json.duration,
            currency: json.currency,
            amount: json.amount,
            stripeCheckoutSessionId: json.stripe_checkout_session_id,
            stripePaymentIntentId: json.stripe_payment_intent_id,
            consumesAt: json.consumes_at,
            expiresAt: json.expires_at,
            status: json.status,
            purchasedAt: json.purchased_at,
            redeemedAt: json.redeemed_at,
            consumedAt: json.consumed_at,
            expiredAt: json.expired_at,
            refundedAt: json.refunded_at
        });
    }
}
