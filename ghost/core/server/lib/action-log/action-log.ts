import ObjectID from 'bson-objectid';
import type { Knex } from 'knex';
import type { GhostLogger } from '@tryghost/logging';
import type { RequestContext } from '../actor';
import { toDatabaseDate } from '../db-types/date';
import type { ActionKind, ActionVerb } from './kinds';

interface ActionOf<K extends ActionKind> {
  resourceType: K;
  event: ActionVerb<K>;
  /** What happened, in words, when the event alone doesn't say it, such as "reset". */
  actionName?: string;
  /** Anything else stored with the action, such as a field's key. */
  context?: ExtraContext;
}

/** The context keys the row's own fields are stored under, which extra context can't replace. */
type ReservedKey = 'primary_name' | 'action_name' | 'count';

type ExtraContext = Record<string, unknown> & { [key in ReservedKey]?: never };

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
  count?: number;
}

/**
 * An action to log. Only the kinds in `ACTION_KINDS` can be logged, and only with the verbs
 * each declares.
 */
export type ActionRow = {
  [K in ActionKind]: ActionOf<K> & (SingleChange | BulkChange);
}[ActionKind];

/**
 * Logs staff actions to the `actions` table, which Admin's History page reads.
 *
 * Call it from the command that makes the change, with the command's transaction where it has
 * one, so the action is only kept if the change is. Inside a transaction the action is part of
 * the change: a failed write fails the command, and its change rolls back. Outside one, logging
 * is best-effort: a failed write is logged and the change stands.
 */
export class ActionLog {
  private logging: Pick<GhostLogger, 'error'>;

  constructor({ logging }: { logging: Pick<GhostLogger, 'error'> }) {
    this.logging = logging;
  }

  /**
   * Logs an action by whoever `context` says is acting, through `db`: the command's transaction,
   * or the database itself for a change that commits on its own. Nothing is logged when nobody
   * is acting.
   */
  async record(
    db: Knex | Knex.Transaction,
    context: RequestContext,
    row: ActionRow,
  ): Promise<void> {
    const { actor } = context;
    if (!actor) {
      return;
    }
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
      if (db.isTransaction) {
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

// Only the fields that carry meaning are stored, as Bookshelf's action log does.
function contextOf(row: ActionRow): string | null {
  const context = {
    ...(row.primaryName === undefined ? {} : { primary_name: row.primaryName }),
    ...withoutReservedKeys(row.context),
    ...(row.actionName === undefined ? {} : { action_name: row.actionName }),
    ...(row.count === undefined ? {} : { count: row.count }),
  };
  return Object.keys(context).length ? JSON.stringify(context) : null;
}

const RESERVED_KEYS: ReadonlySet<string> = new Set<ReservedKey>([
  'primary_name',
  'action_name',
  'count',
]);

// The type already rules these out; this keeps an untyped caller from replacing them too.
function withoutReservedKeys(context: ExtraContext = {}): Record<string, unknown> {
  return Object.fromEntries(Object.entries(context).filter(([key]) => !RESERVED_KEYS.has(key)));
}
