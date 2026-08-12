import type {Knex} from 'knex';
import {DbDate} from '../../lib/db-date';
import {GiftDelivery} from './gift-delivery';
import {decodeGiftDeliveryRow, encodeGiftDelivery} from './gift-delivery-codec';
import type {GiftDeliveryOutcome, GiftDeliveryRow} from './gift-delivery-schema';
import {toDatabaseDate, type RepositoryTransactionOptions} from './gift-bookshelf-repository';

export interface GiftDeliverySchedule {
    delivery: GiftDelivery;
    availableAt: Date;
}

export interface GiftDeliveryRepository {
    getById(id: string, options?: RepositoryTransactionOptions): Promise<GiftDelivery | null>;
    getByGiftId(giftId: string, options?: RepositoryTransactionOptions): Promise<GiftDelivery | null>;
    findDue(now: Date, limit: number): Promise<GiftDeliverySchedule[]>;
    findPending(): Promise<GiftDeliverySchedule[]>;
    countStuck(before: Date): Promise<number>;
    tryStartAttempt(id: string, now: Date, maxAttempts: number): Promise<GiftDelivery | null>;
    markSent(id: string, sentAt: Date, providerMessageId: string | null): Promise<boolean>;
    markForRetry(id: string, nextAttemptAt: Date): Promise<boolean>;
    markFailed(id: string): Promise<boolean>;
    markCancelled(id: string): Promise<boolean>;
    cancelPendingForGift(token: string, options?: RepositoryTransactionOptions): Promise<boolean>;
    recordOutcome(data: {providerMessageId: string; outcome: GiftDeliveryOutcome; timestamp: Date; error: string | null}): Promise<boolean>;
    create(delivery: GiftDelivery, options?: RepositoryTransactionOptions): Promise<void>;
    transaction<T>(callback: (transacting: Knex.Transaction) => Promise<T>): Promise<T>;
}

type BookshelfDocument<T> = {
    toJSON(): T;
};

type BookshelfFindOptions = RepositoryTransactionOptions & {
    require?: boolean;
};

type GiftDeliveryBookshelfModel = {
    add(data: GiftDeliveryRow, options?: RepositoryTransactionOptions): Promise<BookshelfDocument<GiftDeliveryRow>>;
    findOne(data: Partial<GiftDeliveryRow>, options?: BookshelfFindOptions): Promise<BookshelfDocument<GiftDeliveryRow> | null>;
    transaction<T>(callback: (transacting: Knex.Transaction) => Promise<T>): Promise<T>;
};

type PendingDeliveryRow = GiftDeliveryRow & {
    available_at: Date | string | number | null;
    purchased_at: Date | string | number;
};

export class GiftDeliveryBookshelfRepository implements GiftDeliveryRepository {
    private readonly model: GiftDeliveryBookshelfModel;

    constructor({GiftDeliveryModel}: {GiftDeliveryModel: GiftDeliveryBookshelfModel}) {
        this.model = GiftDeliveryModel;
    }

    async getById(id: string, options: RepositoryTransactionOptions = {}): Promise<GiftDelivery | null> {
        const model = await this.model.findOne({id}, {require: false, ...options});

        return model ? decodeGiftDeliveryRow(model.toJSON()) : null;
    }

    async getByGiftId(giftId: string, options: RepositoryTransactionOptions = {}): Promise<GiftDelivery | null> {
        const model = await this.model.findOne({gift_id: giftId}, {require: false, ...options});

        return model ? decodeGiftDeliveryRow(model.toJSON()) : null;
    }

    async findDue(now: Date, limit: number): Promise<GiftDeliverySchedule[]> {
        return this.transaction(async (transacting) => {
            const dueAt = toDatabaseDate(now);
            const rows = await transacting<PendingDeliveryRow>('gift_deliveries as delivery')
                .innerJoin('gifts as gift', 'gift.id', 'delivery.gift_id')
                .where('gift.status', 'purchased')
                .whereRaw('COALESCE(gift.available_at, gift.purchased_at) <= ?', [dueAt])
                .where('delivery.status', 'pending')
                .where((builder) => {
                    builder.whereNull('delivery.attempt_at').orWhere('delivery.attempt_at', '<=', dueAt);
                })
                .orderByRaw('COALESCE(delivery.attempt_at, gift.available_at, gift.purchased_at) ASC')
                .limit(limit)
                .select('delivery.*', 'gift.available_at', 'gift.purchased_at');

            return rows.map(row => ({
                delivery: decodeGiftDeliveryRow(row),
                availableAt: DbDate.parse(row.available_at ?? row.purchased_at)
            }));
        });
    }

    async findPending(): Promise<GiftDeliverySchedule[]> {
        return this.transaction(async (transacting) => {
            const rows = await transacting<PendingDeliveryRow>('gift_deliveries as delivery')
                .innerJoin('gifts as gift', 'gift.id', 'delivery.gift_id')
                .where('gift.status', 'purchased')
                .where('delivery.status', 'pending')
                .orderByRaw('COALESCE(delivery.attempt_at, gift.available_at, gift.purchased_at) ASC')
                .select('delivery.*', 'gift.available_at', 'gift.purchased_at');

            return rows.map(row => ({
                delivery: decodeGiftDeliveryRow(row),
                availableAt: DbDate.parse(row.available_at ?? row.purchased_at)
            }));
        });
    }

    async countStuck(before: Date): Promise<number> {
        return this.transaction(async (transacting) => {
            const row = await transacting('gift_deliveries as delivery')
                .innerJoin('gifts as gift', 'gift.id', 'delivery.gift_id')
                .where('gift.status', 'purchased')
                .where('delivery.status', 'sending')
                .where('delivery.attempt_at', '<=', toDatabaseDate(before))
                .count({count: 'delivery.id'})
                .first();

            return Number(row?.count ?? 0);
        });
    }

    async tryStartAttempt(id: string, now: Date, maxAttempts: number): Promise<GiftDelivery | null> {
        return this.transaction(async (transacting) => {
            const claimAt = toDatabaseDate(now);
            const eligibleGifts = transacting('gifts')
                .select('id')
                .where('status', 'purchased')
                .whereRaw('COALESCE(available_at, purchased_at) <= ?', [claimAt]);

            const updated = await transacting('gift_deliveries')
                .where({id, status: 'pending'})
                .whereIn('gift_id', eligibleGifts)
                .where('attempts', '<', maxAttempts)
                .where((builder) => {
                    builder.whereNull('attempt_at').orWhere('attempt_at', '<=', claimAt);
                })
                .update({
                    status: 'sending',
                    attempt_at: claimAt
                })
                .increment('attempts', 1);

            if (updated !== 1) {
                return null;
            }

            return this.getById(id, {transacting});
        });
    }

    async markSent(id: string, sentAt: Date, providerMessageId: string | null): Promise<boolean> {
        return this.updateState(id, 'sending', {
            status: 'sent',
            email_sent_at: toDatabaseDate(sentAt),
            email_provider_message_id: providerMessageId,
            attempt_at: null
        });
    }

    async markForRetry(id: string, nextAttemptAt: Date): Promise<boolean> {
        return this.updateState(id, 'sending', {
            status: 'pending',
            attempt_at: toDatabaseDate(nextAttemptAt)
        });
    }

    async markFailed(id: string): Promise<boolean> {
        return this.updateState(id, 'sending', {
            status: 'failed',
            attempt_at: null
        });
    }

    async markCancelled(id: string): Promise<boolean> {
        return this.updateState(id, 'sending', {
            status: 'cancelled',
            attempt_at: null
        });
    }

    async cancelPendingForGift(token: string, options: RepositoryTransactionOptions = {}): Promise<boolean> {
        const update = async (transacting: Knex.Transaction) => {
            const gift = transacting('gifts').select('id').where({token});
            const updated = await transacting('gift_deliveries')
                .where({status: 'pending'})
                .whereIn('gift_id', gift)
                .update({status: 'cancelled', attempt_at: null});

            return updated === 1;
        };

        return options.transacting ? update(options.transacting) : this.transaction(update);
    }

    async recordOutcome({providerMessageId, outcome, timestamp, error}: {providerMessageId: string; outcome: GiftDeliveryOutcome; timestamp: Date; error: string | null}): Promise<boolean> {
        return this.transaction(async (transacting) => {
            const updated = await transacting('gift_deliveries')
                .where({email_provider_message_id: providerMessageId})
                .where((builder) => {
                    builder.whereNull('outcome_at').orWhere('outcome_at', '<', toDatabaseDate(timestamp));
                })
                .update({
                    outcome,
                    outcome_at: toDatabaseDate(timestamp),
                    outcome_error: error
                });

            return updated === 1;
        });
    }

    async create(delivery: GiftDelivery, options: RepositoryTransactionOptions = {}): Promise<void> {
        await this.model.add(encodeGiftDelivery(delivery), options);
    }

    async transaction<T>(callback: (transacting: Knex.Transaction) => Promise<T>): Promise<T> {
        return this.model.transaction(callback);
    }

    private async updateState(id: string, from: 'sending', data: Record<string, unknown>): Promise<boolean> {
        return this.transaction(async (transacting) => {
            const updated = await transacting('gift_deliveries')
                .where({id, status: from})
                .update(data);

            return updated === 1;
        });
    }
}
