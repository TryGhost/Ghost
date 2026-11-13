import ObjectID from 'bson-objectid';
import type { Knex } from 'knex';
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
 * An action is part of the change it records, so it's written in the command's transaction: it's
 * kept when the change is kept and never without it. A failed write fails the command, and its
 * change rolls back.
 */
export class ActionLog {
  /**
   * Logs an action by whoever `context` says is acting, in the command's transaction. Nothing is
   * logged when nobody is acting.
   */
  async record(
    transacting: Knex.Transaction,
    context: RequestContext,
    row: ActionRow,
  ): Promise<void> {
    const { actor } = context;
    if (!actor) {
      return;
    }
    await transacting('actions').insert({
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
