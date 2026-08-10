import errors from '@tryghost/errors';
import {chainTransformers, mapKeys, replaceFilters} from '@tryghost/mongo-utils';
import type {Knex} from 'knex';
import moment from 'moment';
import {Gift} from './gift';
import {decodeGiftRow, encodeGift} from './gift-codec';
import type {GiftCadence, GiftRow} from './gift-schema';

type ParsedNqlFilter = unknown;

export const toDatabaseDate = (date: Date): string => moment.utc(date).format('YYYY-MM-DD HH:mm:ss');

export interface GiftEventBrowseOptions {
    filter?: string;
    limit?: number | 'all';
    order?: string;
    page?: number;
}

export interface Pagination {
    page: number;
    pages: number;
    limit: number | 'all';
    total: number;
    prev: number | null;
    next: number | null;
}

export interface GiftEventData {
    id: string;
    member: Record<string, unknown> | null;
    member_id: string | null;
    tier_name?: string;
    cadence: GiftCadence;
    duration: number;
    amount: number;
    currency: string;
    created_at: Date | string | null;
}

export interface GiftEventPage {
    data: Array<{
        type: 'gift_purchase_event' | 'gift_redemption_event';
        data: GiftEventData;
    }>;
    meta: {
        pagination?: Pagination;
    };
}

export interface RepositoryTransactionOptions {
    transacting?: Knex.Transaction;
    forUpdate?: boolean;
}

export interface FindPendingReminderOptions {
    now: Date;
    reminderLeadMs: number;
    reminderFloorMs: number;
    transacting?: Knex.Transaction;
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
    findPendingDeliveries(): Promise<Gift[]>;
    countStuckDeliveries(before: Date): Promise<number>;
    claimPendingDelivery(token: string, now: Date, maxAttempts: number): Promise<Gift | null>;
    markDeliverySent(token: string, sentAt: Date, providerMessageId: string | null): Promise<boolean>;
    markDeliveryForRetry(token: string, nextAttemptAt: Date): Promise<boolean>;
    markDeliveryFailed(token: string): Promise<boolean>;
    getActiveByMember(memberId: string, options?: RepositoryTransactionOptions): Promise<Gift | null>;
    getActiveByMembers(memberIds: string[], options?: RepositoryTransactionOptions): Promise<Map<string, Gift>>;
    browsePurchaseEvents(options?: GiftEventBrowseOptions, filter?: ParsedNqlFilter): Promise<GiftEventPage>;
    browseRedemptionEvents(options?: GiftEventBrowseOptions, filter?: ParsedNqlFilter): Promise<GiftEventPage>;
    create(gift: Gift, options?: RepositoryTransactionOptions): Promise<void>;
    update(gift: Gift, options?: RepositoryTransactionOptions): Promise<void>;
    transaction<T>(callback: (transacting: Knex.Transaction) => Promise<T>): Promise<T>;
}

type BookshelfSaveOptions = RepositoryTransactionOptions & {
    autoRefresh?: boolean;
    method?: 'update';
    patch?: boolean;
};

type GiftEventQueryOptions = GiftEventBrowseOptions & {
    withRelated: Array<'buyer' | 'redeemer' | 'tier'>;
    filter: string;
    useBasicCount: boolean;
    mongoTransformer: (filter: ParsedNqlFilter) => ParsedNqlFilter;
};

type BookshelfFindOptions = RepositoryTransactionOptions & {
    columns?: string[];
    filter?: string;
    require?: boolean;
};

type BookshelfDocument<T> = {
    save(data: Partial<T>, options?: BookshelfSaveOptions): Promise<BookshelfDocument<T>>;
    toJSON(): T;
};

type BookshelfCollection<T> = {
    models: BookshelfDocument<T>[];
};

type GiftEventBookshelfRow = {
    id: string;
    buyer_member_id: string | null;
    redeemer_member_id: string | null;
    buyer?: Record<string, unknown> | null;
    redeemer?: Record<string, unknown> | null;
    tier?: {name?: string} | null;
    cadence: GiftCadence;
    duration: number;
    amount: number;
    currency: string;
    purchased_at: Date | string;
    redeemed_at: Date | string | null;
};

type GiftEventBookshelfDocument = {
    toJSON(options?: GiftEventQueryOptions): GiftEventBookshelfRow;
};

type BookshelfModel<T> = {
    add(data: Partial<T>, options?: RepositoryTransactionOptions): Promise<BookshelfDocument<T>>;
    transaction<R>(callback: (transacting: Knex.Transaction) => Promise<R>): Promise<R>;
    findOne(data: Partial<T> & {id?: string}, options?: BookshelfFindOptions): Promise<BookshelfDocument<T> | null>;
    findAll(options?: BookshelfFindOptions): Promise<BookshelfCollection<T>>;
    findPage(options: GiftEventQueryOptions): Promise<{data: GiftEventBookshelfDocument[]; meta: GiftEventPage['meta']}>;
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

    browsePurchaseEvents(options: GiftEventBrowseOptions = {}, filter?: ParsedNqlFilter): Promise<GiftEventPage> {
        return this.browseEvents({
            options,
            filter,
            type: 'gift_purchase_event',
            relation: 'buyer',
            memberIdColumn: 'buyer_member_id',
            dateColumn: 'purchased_at'
        });
    }

    browseRedemptionEvents(options: GiftEventBrowseOptions = {}, filter?: ParsedNqlFilter): Promise<GiftEventPage> {
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

    async findPendingDeliveries(): Promise<Gift[]> {
        const collection = await this.model.findAll({
            filter: 'status:purchased+delivery_method:email+delivery_status:pending'
        });

        return collection.models.map(model => this.toGift(model));
    }

    async countStuckDeliveries(before: Date): Promise<number> {
        const collection = await this.model.findAll({
            columns: ['id'],
            filter: `status:purchased+delivery_method:email+delivery_status:sending+delivery_attempt_at:<='${before.toISOString()}'`
        });

        return collection.models.length;
    }

    async claimPendingDelivery(token: string, now: Date, maxAttempts: number): Promise<Gift | null> {
        return this.transaction(async (transacting) => {
            const claimAt = toDatabaseDate(now);
            const query = transacting('gifts')
                .where({
                    token,
                    status: 'purchased',
                    delivery_method: 'email',
                    delivery_status: 'pending'
                })
                .where('delivery_attempts', '<', maxAttempts)
                .where((builder) => {
                    builder.whereNull('deliver_at').orWhere('deliver_at', '<=', claimAt);
                })
                .where((builder) => {
                    builder.whereNull('delivery_attempt_at').orWhere('delivery_attempt_at', '<=', claimAt);
                });

            const updated = await query
                .update({
                    delivery_status: 'sending',
                    delivery_attempt_at: claimAt
                })
                .increment('delivery_attempts', 1);

            if (updated !== 1) {
                return null;
            }

            return this.getByToken(token, {transacting});
        });
    }

    async markDeliverySent(token: string, sentAt: Date, providerMessageId: string | null): Promise<boolean> {
        return this.updateDeliveryState(token, 'sending', {
            delivery_status: 'sent',
            email_sent_at: sentAt,
            email_provider_message_id: providerMessageId,
            delivery_attempt_at: null
        });
    }

    async markDeliveryForRetry(token: string, nextAttemptAt: Date): Promise<boolean> {
        return this.updateDeliveryState(token, 'sending', {
            delivery_status: 'pending',
            delivery_attempt_at: nextAttemptAt
        });
    }

    async markDeliveryFailed(token: string): Promise<boolean> {
        return this.updateDeliveryState(token, 'sending', {
            delivery_status: 'failed',
            delivery_attempt_at: null
        });
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

    async transaction<T>(callback: (transacting: Knex.Transaction) => Promise<T>): Promise<T> {
        return await this.model.transaction(callback);
    }

    private async updateDeliveryState(token: string, from: 'sending', data: Partial<GiftRow>): Promise<boolean> {
        return this.transaction(async (transacting) => {
            const updated = await transacting('gifts')
                .where({token, delivery_status: from})
                .update(data);

            return updated === 1;
        });
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
        options: GiftEventBrowseOptions;
        filter?: ParsedNqlFilter;
        type: 'gift_purchase_event' | 'gift_redemption_event';
        relation: 'buyer' | 'redeemer';
        memberIdColumn: 'buyer_member_id' | 'redeemer_member_id';
        dateColumn: 'purchased_at' | 'redeemed_at';
    }): Promise<GiftEventPage> {
        const replaceCustomFilter = (existingFilter: ParsedNqlFilter): ParsedNqlFilter => replaceFilters(existingFilter, {
            custom: filter
        });
        const queryOptions: GiftEventQueryOptions = {
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
