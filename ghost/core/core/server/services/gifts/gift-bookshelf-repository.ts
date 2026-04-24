import errors from '@tryghost/errors';
import {Gift, type GiftCadence, type GiftStatus} from './gift';
import type {FindPendingReminderOptions, GiftRepository, RepositoryTransactionOptions} from './gift-repository';

type BookshelfDocument<T> = {
    save(data: Partial<T>, options?: unknown): Promise<unknown>;
    set(data: Partial<T>): void;
    toJSON(): T;
};

type BookshelfCollection<T> = {
    models: BookshelfDocument<T>[];
};

type BookshelfModel<T> = {
    add(data: Partial<T>, unfilteredOptions?: unknown): Promise<T>;
    transaction<R>(callback: (transacting: unknown) => Promise<R>): Promise<R>;
    findOne(data: Record<string, unknown>, unfilteredOptions?: unknown): Promise<BookshelfDocument<T> | null>;
    findAll(unfilteredOptions?: unknown): Promise<BookshelfCollection<T>>;
};

type GiftRow = {
    id: string;
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
    consumes_soon_reminder_sent_at: Date | null;
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

    async getById(id: string, options: RepositoryTransactionOptions = {}): Promise<Gift | null> {
        const model = await this.model.findOne({
            id
        }, {require: false, ...options});

        return model ? this.toGift(model) : null;
    }

    async getByToken(token: string, options: RepositoryTransactionOptions = {}): Promise<Gift | null> {
        const model = await this.model.findOne({
            token
        }, {require: false, ...options});

        return model ? this.toGift(model) : null;
    }

    async getByPaymentIntentId(paymentIntentId: string): Promise<Gift | null> {
        const model = await this.model.findOne({
            stripe_payment_intent_id: paymentIntentId
        }, {require: false});

        return model ? this.toGift(model) : null;
    }

    async getActiveByMember(memberId: string): Promise<Gift | null> {
        const model = await this.model.findOne({
            redeemer_member_id: memberId,
            status: 'redeemed'
        }, {require: false});

        return model ? this.toGift(model) : null;
    }

    async findPendingConsumption(): Promise<Gift[]> {
        const now = new Date();

        const collection = await this.model.findAll({
            filter: `status:redeemed+consumes_at:<'${now.toISOString()}'`
        });

        return collection.models.map(model => this.toGift(model));
    }

    async findPendingExpiration(): Promise<Gift[]> {
        const now = new Date();

        const collection = await this.model.findAll({
            filter: `status:purchased+expires_at:<'${now.toISOString()}'`
        });

        return collection.models.map(model => this.toGift(model));
    }

    async findPendingReminder({now, reminderLeadMs, reminderFloorMs, transacting}: FindPendingReminderOptions): Promise<Gift[]> {
        const upper = new Date(now.getTime() + reminderLeadMs).toISOString();
        const lower = new Date(now.getTime() + reminderFloorMs).toISOString();

        const collection = await this.model.findAll({
            filter: `status:redeemed+consumes_at:<='${upper}'+consumes_at:>'${lower}'+consumes_soon_reminder_sent_at:null`,
            transacting
        });

        return collection.models.map(model => this.toGift(model));
    }

    async create(gift: Gift, options: RepositoryTransactionOptions = {}) {
        await this.model.add(this.toRow(gift), options);
    }

    async update(gift: Gift, options: RepositoryTransactionOptions = {}) {
        const existing = await this.model.findOne({
            token: gift.token
        }, {require: false, ...options});

        if (!existing) {
            throw new errors.InternalServerError({message: `Gift not found: ${gift.token}`});
        }

        await existing.save(this.toRow(gift), {
            autoRefresh: false,
            method: 'update',
            patch: true,
            ...options
        });
    }

    async transaction<T>(callback: (transacting: unknown) => Promise<T>): Promise<T> {
        return await this.model.transaction(callback);
    }

    private toRow(gift: Gift): Omit<GiftRow, 'id'> {
        return {
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
            refunded_at: gift.refundedAt,
            consumes_soon_reminder_sent_at: gift.consumesSoonReminderSentAt
        };
    }

    private toGift(model: BookshelfDocument<GiftRow>): Gift {
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
            refundedAt: json.refunded_at,
            consumesSoonReminderSentAt: json.consumes_soon_reminder_sent_at ?? null
        });
    }
}
