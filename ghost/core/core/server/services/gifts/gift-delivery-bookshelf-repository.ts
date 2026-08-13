import type {Knex} from 'knex';
import {toDatabaseDate} from '../../lib/db-date';
import {decodeGiftDeliveryRow, encodeGiftDelivery} from './gift-delivery-codec';
import type {GiftDeliveryData, GiftDeliveryRow} from './gift-delivery-schema';
import type {RepositoryTransactionOptions} from './gift-bookshelf-repository';

export interface GiftDeliveryRepository {
    getById(id: string, options?: RepositoryTransactionOptions): Promise<GiftDeliveryData | null>;
    getByGiftId(giftId: string, options?: RepositoryTransactionOptions): Promise<GiftDeliveryData | null>;
    tryStartDelivery(id: string, now: Date): Promise<GiftDeliveryData | null>;
    markSent(id: string, sentAt: Date, providerMessageId: string | null): Promise<boolean>;
    markFailed(id: string): Promise<boolean>;
    markCancelled(id: string): Promise<boolean>;
    cancelPendingForGift(token: string, options?: RepositoryTransactionOptions): Promise<boolean>;
    create(delivery: GiftDeliveryData, options?: RepositoryTransactionOptions): Promise<void>;
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

export class GiftDeliveryBookshelfRepository implements GiftDeliveryRepository {
    private readonly model: GiftDeliveryBookshelfModel;

    constructor({GiftDeliveryModel}: {GiftDeliveryModel: GiftDeliveryBookshelfModel}) {
        this.model = GiftDeliveryModel;
    }

    async getById(id: string, options: RepositoryTransactionOptions = {}): Promise<GiftDeliveryData | null> {
        const model = await this.model.findOne({id}, {require: false, ...options});

        return model ? decodeGiftDeliveryRow(model.toJSON()) : null;
    }

    async getByGiftId(giftId: string, options: RepositoryTransactionOptions = {}): Promise<GiftDeliveryData | null> {
        const model = await this.model.findOne({gift_id: giftId}, {require: false, ...options});

        return model ? decodeGiftDeliveryRow(model.toJSON()) : null;
    }

    async tryStartDelivery(id: string, now: Date): Promise<GiftDeliveryData | null> {
        return this.transaction(async (transacting) => {
            const startedAt = toDatabaseDate(now);
            const eligibleGifts = transacting('gifts')
                .select('id')
                .where('status', 'purchased');

            const updated = await transacting('gift_deliveries')
                .where({id, status: 'pending'})
                .whereIn('gift_id', eligibleGifts)
                .update({
                    status: 'sending',
                    started_at: startedAt
                });

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
            started_at: null
        });
    }

    async markFailed(id: string): Promise<boolean> {
        return this.updateState(id, 'sending', {
            status: 'failed',
            started_at: null
        });
    }

    async markCancelled(id: string): Promise<boolean> {
        return this.updateState(id, 'sending', {
            status: 'cancelled',
            started_at: null
        });
    }

    async cancelPendingForGift(token: string, options: RepositoryTransactionOptions = {}): Promise<boolean> {
        const update = async (transacting: Knex.Transaction) => {
            const gift = transacting('gifts').select('id').where({token});
            const updated = await transacting('gift_deliveries')
                .where({status: 'pending'})
                .whereIn('gift_id', gift)
                .update({status: 'cancelled', started_at: null});

            return updated === 1;
        };

        return options.transacting ? update(options.transacting) : this.transaction(update);
    }

    async create(delivery: GiftDeliveryData, options: RepositoryTransactionOptions = {}): Promise<void> {
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
