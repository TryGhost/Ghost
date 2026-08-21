import type { Knex } from 'knex';
import { toDatabaseDate } from '../../lib/db-date';
import { decodeGiftDeliveryRow, encodeGiftDelivery } from './gift-delivery-codec';
import type {
  GiftDeliveryData,
  GiftDeliveryOutcome,
  GiftDeliveryRow,
} from './gift-delivery-schema';
import type { RepositoryTransactionOptions } from './gift-bookshelf-repository';

export type GiftDeliveryOutcomeRecordResult = 'recorded' | 'stale' | 'not_found';

export interface GiftDeliveryRepository {
  getById(id: string, options?: RepositoryTransactionOptions): Promise<GiftDeliveryData | null>;
  getByGiftId(
    giftId: string,
    options?: RepositoryTransactionOptions,
  ): Promise<GiftDeliveryData | null>;
  getByProviderMessageId(providerMessageId: string): Promise<GiftDeliveryData | null>;
  findRecoverableForPurchasedGifts(staleBefore: Date, limit: number): Promise<GiftDeliveryData[]>;
  tryStartDelivery(id: string, now: Date, staleBefore: Date): Promise<GiftDeliveryData | null>;
  markSent(id: string, sentAt: Date, providerMessageId: string | null): Promise<boolean>;
  recordCancelledAcceptance(
    id: string,
    sentAt: Date,
    providerMessageId: string | null,
  ): Promise<boolean>;
  markFailed(id: string): Promise<boolean>;
  markCancelled(id: string): Promise<boolean>;
  cancelPendingForGift(token: string, options?: RepositoryTransactionOptions): Promise<boolean>;
  recordOutcome(data: {
    providerMessageId: string;
    outcome: GiftDeliveryOutcome;
    timestamp: Date;
    error: string | null;
  }): Promise<GiftDeliveryOutcomeRecordResult>;
  create(delivery: GiftDeliveryData, options?: RepositoryTransactionOptions): Promise<void>;
}

type BookshelfDocument<T> = {
  toJSON(): T;
};

type BookshelfFindOptions = RepositoryTransactionOptions & {
  require?: boolean;
};

type GiftDeliveryBookshelfModel = {
  add(
    data: GiftDeliveryRow,
    options?: RepositoryTransactionOptions,
  ): Promise<BookshelfDocument<GiftDeliveryRow>>;
  findOne(
    data: Partial<GiftDeliveryRow>,
    options?: BookshelfFindOptions,
  ): Promise<BookshelfDocument<GiftDeliveryRow> | null>;
};

// Deliveries that still need a send attempt: never started, or claimed by a
// process that has since died and left the claim stale
function recoverableDeliveries(query: Knex.QueryBuilder, staleBefore: Date): void {
  query.andWhere((recoverable) => {
    recoverable.where('gift_deliveries.status', 'pending').orWhere((stale) => {
      stale
        .where('gift_deliveries.status', 'sending')
        .where('gift_deliveries.started_at', '<=', toDatabaseDate(staleBefore));
    });
  });
}

export class GiftDeliveryBookshelfRepository implements GiftDeliveryRepository {
  private readonly model: GiftDeliveryBookshelfModel;
  private readonly knex: Knex;

  constructor({
    GiftDeliveryModel,
    knex,
  }: {
    GiftDeliveryModel: GiftDeliveryBookshelfModel;
    knex: Knex;
  }) {
    this.model = GiftDeliveryModel;
    this.knex = knex;
  }

  async getById(
    id: string,
    options: RepositoryTransactionOptions = {},
  ): Promise<GiftDeliveryData | null> {
    const model = await this.model.findOne({ id }, { require: false, ...options });

    return model ? decodeGiftDeliveryRow(model.toJSON()) : null;
  }

  async getByGiftId(
    giftId: string,
    options: RepositoryTransactionOptions = {},
  ): Promise<GiftDeliveryData | null> {
    const model = await this.model.findOne({ gift_id: giftId }, { require: false, ...options });

    return model ? decodeGiftDeliveryRow(model.toJSON()) : null;
  }

  async getByProviderMessageId(providerMessageId: string): Promise<GiftDeliveryData | null> {
    const model = await this.model.findOne(
      { email_provider_message_id: providerMessageId },
      { require: false },
    );

    return model ? decodeGiftDeliveryRow(model.toJSON()) : null;
  }

  async findRecoverableForPurchasedGifts(
    staleBefore: Date,
    limit: number,
  ): Promise<GiftDeliveryData[]> {
    const rows = await this.knex('gift_deliveries')
      .select('gift_deliveries.*')
      .join('gifts', 'gifts.id', 'gift_deliveries.gift_id')
      .where('gifts.status', 'purchased')
      .modify(recoverableDeliveries, staleBefore)
      .limit(limit);

    return rows.map(decodeGiftDeliveryRow);
  }

  async tryStartDelivery(
    id: string,
    now: Date,
    staleBefore: Date,
  ): Promise<GiftDeliveryData | null> {
    const claimed = await this.knex('gift_deliveries')
      .where({ id })
      .whereExists((query) => {
        query
          .select('gifts.id')
          .from('gifts')
          .whereRaw('gifts.id = gift_deliveries.gift_id')
          .where('gifts.status', 'purchased');
      })
      .modify(recoverableDeliveries, staleBefore)
      .update({
        status: 'sending',
        started_at: toDatabaseDate(now),
      });

    if (claimed !== 1) {
      return null;
    }

    return this.getById(id);
  }

  async markSent(id: string, sentAt: Date, providerMessageId: string | null): Promise<boolean> {
    return this.updateState(id, 'sending', {
      status: 'sent',
      email_sent_at: toDatabaseDate(sentAt),
      email_provider_message_id: providerMessageId,
      started_at: null,
    });
  }

  // A delivery cancelled while its email was in flight keeps the acceptance
  // details so the message can still be correlated with transport outcomes
  async recordCancelledAcceptance(
    id: string,
    sentAt: Date,
    providerMessageId: string | null,
  ): Promise<boolean> {
    return this.updateState(id, 'cancelled', {
      email_sent_at: toDatabaseDate(sentAt),
      email_provider_message_id: providerMessageId,
    });
  }

  async markFailed(id: string): Promise<boolean> {
    return this.updateState(id, 'sending', {
      status: 'failed',
      started_at: null,
    });
  }

  async markCancelled(id: string): Promise<boolean> {
    return this.updateState(id, 'sending', {
      status: 'cancelled',
      started_at: null,
    });
  }

  async cancelPendingForGift(
    token: string,
    options: RepositoryTransactionOptions = {},
  ): Promise<boolean> {
    const db = options.transacting ?? this.knex;
    const gift = db('gifts').select('id').where({ token });
    const updated = await db('gift_deliveries')
      .whereIn('status', ['pending', 'sending'])
      .whereIn('gift_id', gift)
      .update({ status: 'cancelled', started_at: null });

    return updated === 1;
  }

  async recordOutcome({
    providerMessageId,
    outcome,
    timestamp,
    error,
  }: {
    providerMessageId: string;
    outcome: GiftDeliveryOutcome;
    timestamp: Date;
    error: string | null;
  }): Promise<GiftDeliveryOutcomeRecordResult> {
    const outcomeAt = toDatabaseDate(timestamp);
    const lowerPriorityOutcomes: GiftDeliveryOutcome[] =
      outcome === 'permanent_failed'
        ? ['temporary_failed', 'delivered']
        : outcome === 'delivered'
          ? ['temporary_failed']
          : [];
    const updated = await this.knex('gift_deliveries')
      .where({ email_provider_message_id: providerMessageId })
      .whereNot({ outcome: 'permanent_failed' })
      .where((builder) => {
        builder.whereNull('outcome_at').orWhere('outcome_at', '<', outcomeAt);

        // Database dates have second precision. Allow a same-second outcome
        // to advance, while preventing refetches from regressing or replaying it.
        if (lowerPriorityOutcomes.length > 0) {
          builder.orWhere((sameSecond) => {
            sameSecond
              .where('outcome_at', '=', outcomeAt)
              .whereIn('outcome', lowerPriorityOutcomes);
          });
        }
      })
      .update({
        outcome,
        outcome_at: outcomeAt,
        outcome_error: error,
      });

    if (updated === 1) {
      return 'recorded';
    }

    const delivery = await this.knex('gift_deliveries')
      .select('id')
      .where({ email_provider_message_id: providerMessageId })
      .first();

    return delivery ? 'stale' : 'not_found';
  }

  async create(
    delivery: GiftDeliveryData,
    options: RepositoryTransactionOptions = {},
  ): Promise<void> {
    await this.model.add(encodeGiftDelivery(delivery), options);
  }

  private async updateState(
    id: string,
    from: 'sending' | 'cancelled',
    data: Record<string, unknown>,
  ): Promise<boolean> {
    const updated = await this.knex('gift_deliveries').where({ id, status: from }).update(data);

    return updated === 1;
  }
}
