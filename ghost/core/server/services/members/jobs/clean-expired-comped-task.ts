import type { Knex } from 'knex';

const ObjectId = require('bson-objectid').default;
const { chunk: chunkArray } = require('lodash');
const moment = require('moment');

interface MemberRow {
  id: string;
  status: string;
  updated_at: Date | string;
}

interface ExpiredCompedRow {
  id: string;
  member_id: string;
}

interface MemberModel {
  attributes: Record<string, unknown>;
  _previousAttributes?: Record<string, unknown>;
  _changed?: Record<string, unknown>;
}

interface CleanExpiredCompedDeps {
  db: { knex: Knex };
  models: {
    Member: {
      findOne(
        data: Record<string, unknown>,
        options: Record<string, unknown>,
      ): Promise<MemberModel>;
    };
  };
  events: { emit(name: string, model: MemberModel, options: Record<string, unknown>): void };
  logging: {
    info(...args: unknown[]): void;
    warn(...args: unknown[]): void;
    error(...args: unknown[]): void;
  };
  sentry: { captureException(err: unknown): void };
}

export interface CleanExpiredCompedResult {
  deletedSubscriptionCount: number;
  updatedMemberCount: number;
  emittedEventCount: number;
}

// Removes expired comped entries from the members_products table, moves the
// affected members from comped to free and records a comped->free status
// event for each of them. The three writes commit or roll back together, so a
// failed run leaves the source rows in place and a repeat run redoes the whole
// unit of work instead of finishing a half-applied one.
async function cleanExpiredComped({
  db,
  models,
  events,
  logging,
  sentry,
}: CleanExpiredCompedDeps): Promise<CleanExpiredCompedResult> {
  const startedAt = Date.now();

  const { deletedSubscriptionCount, updatedMemberCount, updatedMembers, now } =
    await db.knex.transaction(async (trx) => {
      const expiredCompedRows: ExpiredCompedRow[] = await trx('members_products')
        // we need to be careful about the type here. .format() is the only
        // thing that works across SQLite and MySQL: an ISO cutoff compares
        // lexically against SQLite's 'YYYY-MM-DD HH:mm:ss' text and its 'T'
        // sorts above ' ', wrongly matching same-UTC-day expiries
        .where('expiry_at', '<', moment.utc().startOf('day').format('YYYY-MM-DD HH:mm:ss'))
        .select('*');

      if (!expiredCompedRows.length) {
        return {
          deletedSubscriptionCount: 0,
          updatedMemberCount: 0,
          updatedMembers: [] as MemberRow[],
          now: new Date(),
        };
      }

      const rowIds = expiredCompedRows.map((d) => d.id);
      const memberIds = expiredCompedRows.map((d) => d.member_id);

      // Only members still in the comped status change; anyone already paid,
      // free or deleted is left untouched. The rows are locked for the rest
      // of the transaction so a concurrent status change cannot slip between
      // this read and the update below (forUpdate is a no-op on SQLite,
      // where the single-writer transaction already guarantees this). The
      // members rows are locked BEFORE the members_products delete so this
      // transaction acquires locks in the same members -> members_products
      // order as the member-edit flows (Bookshelf edit, linkSubscription);
      // the reverse order could deadlock against them.
      const compedMembers: MemberRow[] = await trx('members')
        .whereIn('id', memberIds)
        .andWhere('status', 'comped')
        .forUpdate();

      const deletedCount = await trx('members_products').whereIn('id', rowIds).del();

      const updateMemberIds = compedMembers.map((d) => d.id);
      const updatedAt = new Date();

      const updatedCount = await trx('members').whereIn('id', updateMemberIds).update({
        status: 'free',
        updated_at: updatedAt,
      });

      const statusEvents = compedMembers.map((member) => {
        return {
          id: ObjectId().toHexString(),
          member_id: member.id,
          from_status: member.status,
          to_status: 'free',
          created_at: updatedAt,
        };
      });

      // SQLite >= 3.32.0 can support 32766 host parameters
      // each row uses 5 variables so ⌊32766/5⌋ = 6553
      const chunkSize = 6553;

      for (const chunk of chunkArray(statusEvents, chunkSize)) {
        await trx('members_status_events').insert(chunk);
      }

      return {
        deletedSubscriptionCount: deletedCount,
        updatedMemberCount: updatedCount,
        updatedMembers: compedMembers,
        now: updatedAt,
      };
    });

  // Emitted after the commit so listeners never observe state that could
  // still roll back. A failed emission is logged and skipped rather than
  // failing the job: the database changes are already durable and the
  // emitted_event_count below makes the shortfall visible.
  let emittedEventCount = 0;
  for (const member of updatedMembers) {
    const emitted = await emitMemberEditedEvent({ member, now, models, events, logging, sentry });
    if (emitted) {
      emittedEventCount += 1;
    }
  }

  logging.info(
    {
      system: {
        event: 'clean_expired_comped.completed',
        deleted_subscription_count: deletedSubscriptionCount,
        updated_member_count: updatedMemberCount,
        emitted_event_count: emittedEventCount,
        duration_ms: Date.now() - startedAt,
      },
    },
    `[Background Job] clean-expired-comped removed ${deletedSubscriptionCount} expired subscriptions and updated ${updatedMemberCount} members`,
  );

  return { deletedSubscriptionCount, updatedMemberCount, emittedEventCount };
}

interface EmitMemberEditedEventOptions {
  member: MemberRow;
  now: Date;
  models: CleanExpiredCompedDeps['models'];
  events: CleanExpiredCompedDeps['events'];
  logging: CleanExpiredCompedDeps['logging'];
  sentry: CleanExpiredCompedDeps['sentry'];
}

// Emits member.edited in the shape its listeners (webhooks in particular)
// expect: a freshly loaded model whose _previousAttributes carry the
// pre-cleanup status and _changed the comped->free transition, with an
// internal context.
async function emitMemberEditedEvent({
  member,
  now,
  models,
  events,
  logging,
  sentry,
}: EmitMemberEditedEventOptions): Promise<boolean> {
  try {
    const model = await models.Member.findOne(
      { id: member.id },
      { require: true, context: { internal: true } },
    );

    model._previousAttributes = normalizeDates({
      ...model.attributes,
      status: member.status,
      updated_at: member.updated_at,
    });
    model._changed = normalizeDates({
      status: 'free',
      updated_at: now,
    });

    events.emit('member.edited', model, { context: { internal: true } });
    return true;
  } catch (err) {
    if (isNotFoundError(err)) {
      logging.warn(
        `Could not emit member.edited for expired comped member: Member ${member.id} was not found`,
      );
      return false;
    }

    logging.error(err);
    sentry.captureException(err);
    return false;
  }
}

function normalizeDates(attributes: Record<string, unknown>): Record<string, unknown> {
  const normalized = { ...attributes };

  for (const [key, value] of Object.entries(normalized)) {
    if (key.endsWith('_at') && value && !(value instanceof Date)) {
      normalized[key] = moment.utc(value).toDate();
    }
  }

  return normalized;
}

function isNotFoundError(err: unknown): boolean {
  if (!err || typeof err !== 'object') {
    return false;
  }

  const errorType = 'errorType' in err ? err.errorType : undefined;
  const name = 'name' in err ? err.name : undefined;
  const message = 'message' in err ? err.message : undefined;

  return (
    errorType === 'NotFoundError' ||
    name === 'NotFoundError' ||
    message === 'NotFound' ||
    message === 'EmptyResponse'
  );
}

export default cleanExpiredComped;
