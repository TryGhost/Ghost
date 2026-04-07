import {Gift} from './gift';

type BookshelfModel<T> = {
    add(data: Partial<T>, unfilteredOptions?: unknown): Promise<T>;
    findOne(data: Record<string, unknown>, unfilteredOptions?: unknown): Promise<T | null>;
};

type GiftBookshelfModel = BookshelfModel<Record<string, unknown>>;

export class GiftBookshelfRepository {
    readonly #Model: GiftBookshelfModel;

    constructor({GiftModel}: {GiftModel: GiftBookshelfModel}) {
        this.#Model = GiftModel;
    }

    async existsByCheckoutSessionId(checkoutSessionId: string): Promise<boolean> {
        const existing = await this.#Model.findOne({
            stripe_checkout_session_id: checkoutSessionId
        }, {require: false});

        return !!existing;
    }

    async create(gift: Gift) {
        await this.#Model.add({
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
}
