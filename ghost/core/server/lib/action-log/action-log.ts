import ObjectID from 'bson-objectid';
import type { Knex } from 'knex';
import type { GhostLogger } from '@tryghost/logging';
import type { Actor } from '../actor';
import { toDatabaseDate } from '../db-types/date';
import type { ActionEvent, ActionKind, ActionName } from './kinds';

interface ActionOf<K extends ActionKind> {
  resourceType: K;
  event: ActionEvent;
  /** What happened, in words, when the event alone doesn't say it, such as "reset". */
  actionName?: ActionName<K>;
  /** Anything else stored with the action, such as a field's key. */
  context?: Record<string, unknown>;
}

/**
 * A change to one resource. The name is stored with the action, so the history still reads
 * after the resource is deleted.
 */
interface SingleChange {
  resourceId: string;
  primaryName: string;
  count?: never;
}

/** A change to several resources at once, which belongs to none of them. */
interface BulkChange {
  resourceId: null;
  primaryName?: never;
  /** How many resources changed, which Admin shows for more than one. */
  count: number;
}

/**
 * An action to log. Only the kinds in `ACTION_KINDS` can be logged, as added, edited or
 * deleted, and only with the action names each declares.
 */
export type ActionRow = {
  [K in ActionKind]: ActionOf<K> & (SingleChange | BulkChange);
}[ActionKind];

export interface RecordOptions {
  /** The command's transaction, so the action is only kept if the change is. */
  transacting?: Knex.Transaction;
}

/**
 * Logs staff actions to the `actions` table, which Admin's History page reads.
 *
 * Call it from the command that makes the change, inside its transaction where it has one.
 * Logging is best-effort: a failed write is logged and doesn't fail the command, unless it
 * deadlocks inside the command's transaction.
 */
export class ActionLog {
  private knex: Knex;
  private logging: Pick<GhostLogger, 'error'>;

  constructor({ knex, logging }: { knex: Knex; logging: Pick<GhostLogger, 'error'> }) {
    this.knex = knex;
    this.logging = logging;
  }

  /** Logs an action by `actor`. Nothing is logged when nobody is acting. */
  async record(actor: Actor | null, row: ActionRow, options: RecordOptions = {}): Promise<void> {
    if (!actor) {
      return;
    }
    const db = options.transacting ?? this.knex;
    try {
      await db('actions').insert({
        // ObjectIds increase over time, which readers rely on to order actions within a second.
        id: new ObjectID().toHexString(),
        resource_id: row.resourceId,
        resource_type: row.resourceType,
        actor_id: actor.id,
        actor_type: actor.type,
        event: row.event,
        context: contextOf(row),
        created_at: toDatabaseDate(new Date()),
      });
    } catch (err) {
      // A deadlock rolls back the whole transaction, not just this insert, so the command's
      // own writes are gone too. Failing lets the command retry or report it, rather than
      // carry on as if its change was kept.
      if (options.transacting && isDeadlock(err)) {
        throw err;
      }
      this.logging.error(
        {
          event: { name: 'action_log.write_failed' },
          err,
          // Nested, as `event` is the log entry's own name.
          action: {
            resource_type: row.resourceType,
            event: row.event,
            resource_id: row.resourceId,
            actor_type: actor.type,
            actor_id: actor.id,
          },
        },
        'Failed to log an action',
      );
    }
  }
}

function isDeadlock(err: unknown): boolean {
  return (err as { code?: unknown } | null)?.code === 'ER_LOCK_DEADLOCK';
}

// Only the fields that carry meaning are stored, as Bookshelf's action log does.
function contextOf(row: ActionRow): string {
  return JSON.stringify({
    ...(row.primaryName === undefined ? {} : { primary_name: row.primaryName }),
    ...row.context,
    ...(row.actionName === undefined ? {} : { action_name: row.actionName }),
    ...(row.count === undefined ? {} : { count: row.count }),
  });
}
