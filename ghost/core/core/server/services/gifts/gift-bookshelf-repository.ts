import errors from '@tryghost/errors';
import {chainTransformers, mapKeys, replaceFilters} from '@tryghost/mongo-utils';
import {Gift} from './gift';
import {decodeGiftRow, encodeGift} from './gift-codec';
import type {GiftRow} from './gift-schema';

export interface GiftEventPage {
    data: Array<{
        type: 'gift_purchase_event' | 'gift_redemption_event';
        data: Record<string, unknown>;
    }>;
    meta: unknown;
}

export interface RepositoryTransactionOptions {
    transacting?: unknown;
    forUpdate?: boolean;
}

export interface FindPendingReminderOptions {
    now: Date;
    reminderLeadMs: number;
    reminderFloorMs: number;
    transacting?: unknown;
}

export interface GiftRepository {
    existsByCheckoutSessionId(checkoutSessionId: string): Promise<boolean>;
    getById(id: string, options?: RepositoryTransactionOptions): Promise<Gift | null>;
    getByToken(token: string, options?: RepositoryTransactionOptions): Promise<Gift | null>;
    getByPaymentIntentId(paymentIntentId: string): Promise<Gift | null>;
    findPendingConsumption(): Promise<Gift[]>;
    findPendingExpiration(): Promise<Gift[]>;
    findPendingReminder(options: FindPendingReminderOptions): Promise<Gift[]>;
    findUnsentReminders(): Promise<Gift[]>;
    getActiveByMember(memberId: string, options?: RepositoryTransactionOptions): Promise<Gift | null>;
    getActiveByMembers(memberIds: string[], options?: RepositoryTransactionOptions): Promise<Map<string, Gift>>;
    browsePurchaseEvents(options?: Record<string, unknown>, filter?: unknown): Promise<GiftEventPage>;
    browseRedemptionEvents(options?: Record<string, unknown>, filter?: unknown): Promise<GiftEventPage>;
    create(gift: Gift, options?: RepositoryTransactionOptions): Promise<void>;
    update(gift: Gift, options?: RepositoryTransactionOptions): Promise<void>;
    transaction<T>(callback: (transacting: unknown) => Promise<T>): Promise<T>;
}

type BookshelfDocument<T> = {
    save(data: Partial<T>, options?: unknown): Promise<unknown>;
    set(data: Partial<T>): void;
    toJSON(): T;
};

type BookshelfCollection<T> = {
    models: BookshelfDocument<T>[];
};

type GiftEventBookshelfRow = {
    [key: string]: unknown;
    id: string;
    tier?: {name?: string};
    cadence: unknown;
    duration: unknown;
    amount: unknown;
    currency: unknown;
};

type GiftEventBookshelfDocument = {
    toJSON(options?: unknown): GiftEventBookshelfRow;
};

type BookshelfModel<T> = {
    add(data: Partial<T>, unfilteredOptions?: unknown): Promise<T>;
    transaction<R>(callback: (transacting: unknown) => Promise<R>): Promise<R>;
    findOne(data: Record<string, unknown>, unfilteredOptions?: unknown): Promise<BookshelfDocument<T> | null>;
    findAll(unfilteredOptions?: unknown): Promise<BookshelfCollection<T>>;
    findPage?(unfilteredOptions?: unknown): Promise<{data: GiftEventBookshelfDocument[]; meta: unknown}>;
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

    async getActiveByMember(memberId: string, options: RepositoryTransactionOptions = {}): Promise<Gift | null> {
        const model = await this.model.findOne({
            redeemer_member_id: memberId,
            status: 'redeemed'
        }, {require: false, ...options});

        return model ? this.toGift(model) : null;
    }

    async getActiveByMembers(memberIds: string[], options: RepositoryTransactionOptions = {}): Promise<Map<string, Gift>> {
        const map = new Map<string, Gift>();

        if (memberIds.length === 0) {
            return map;
        }

        const idList = memberIds.map(id => `'${id}'`).join(',');
        const collection = await this.model.findAll({
            filter: `redeemer_member_id:[${idList}]+status:redeemed`,
            ...options
        });

        for (const model of collection.models) {
            const gift = this.toGift(model);
            if (gift.redeemerMemberId) {
                map.set(gift.redeemerMemberId, gift);
            }
        }

        return map;
    }

    browsePurchaseEvents(options: Record<string, unknown> = {}, filter?: unknown): Promise<GiftEventPage> {
        return this.browseEvents({
            options,
            filter,
            type: 'gift_purchase_event',
            relation: 'buyer',
            memberIdColumn: 'buyer_member_id',
            dateColumn: 'purchased_at'
        });
    }

    browseRedemptionEvents(options: Record<string, unknown> = {}, filter?: unknown): Promise<GiftEventPage> {
        return this.browseEvents({
            options,
            filter,
            type: 'gift_redemption_event',
            relation: 'redeemer',
            memberIdColumn: 'redeemer_member_id',
            dateColumn: 'redeemed_at'
        });
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

    async findUnsentReminders(): Promise<Gift[]> {
        const now = new Date().toISOString();

        const collection = await this.model.findAll({
            filter: `status:redeemed+consumes_at:>'${now}'+consumes_soon_reminder_sent_at:null`
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

    private toRow(gift: Gift): GiftRow {
        return encodeGift(gift);
    }

    private toGift(model: BookshelfDocument<GiftRow>): Gift {
        return decodeGiftRow(model.toJSON());
    }

    private async browseEvents({
        options,
        filter,
        type,
        relation,
        memberIdColumn,
        dateColumn
    }: {
        options: Record<string, unknown>;
        filter?: unknown;
        type: 'gift_purchase_event' | 'gift_redemption_event';
        relation: 'buyer' | 'redeemer';
        memberIdColumn: 'buyer_member_id' | 'redeemer_member_id';
        dateColumn: 'purchased_at' | 'redeemed_at';
    }): Promise<GiftEventPage> {
        const replaceCustomFilter = (existingFilter: unknown) => replaceFilters(existingFilter, {
            custom: filter
        });
        const queryOptions: Record<string, unknown> = {
            ...options,
            withRelated: [relation, 'tier'],
            filter: `${memberIdColumn}:-null+custom:true`,
            useBasicCount: true,
            mongoTransformer: chainTransformers(
                replaceCustomFilter,
                ...mapKeys({
                    'data.created_at': dateColumn,
                    'data.member_id': memberIdColumn
                })
            )
        };

        if (typeof queryOptions.order === 'string') {
            queryOptions.order = queryOptions.order.replace(/created_at/g, dateColumn);
        }

        if (!this.model.findPage) {
            throw new errors.InternalServerError({message: 'Gift model does not support paginated event queries.'});
        }

        const {data: models, meta} = await this.model.findPage(queryOptions);

        return {
            data: models.map((model) => {
                const json = model.toJSON(queryOptions);

                return {
                    type,
                    data: {
                        id: json.id,
                        member: json[relation] || null,
                        member_id: json[memberIdColumn],
                        tier_name: json.tier?.name,
                        cadence: json.cadence,
                        duration: json.duration,
                        amount: json.amount,
                        currency: json.currency,
                        created_at: json[dateColumn]
                    }
                };
            }),
            meta
        };
    }
}
