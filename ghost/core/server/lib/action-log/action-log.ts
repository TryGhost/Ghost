import ObjectID from 'bson-objectid';
import errors from '@tryghost/errors';
import type { Knex } from 'knex';
import type { GhostLogger } from '@tryghost/logging';
import type { RequestContext } from '../actor';
import { toDatabaseDate } from '../db-types/date';

/** Every action is a resource being added, edited or deleted. Its name, if any, says how. */
export type ActionEvent = 'added' | 'edited' | 'deleted';

/**
 * What a service logs actions about. Each service declares its own kind next to the code that
 * logs it, as a plain object that `satisfies ActionKind`, and logs through `ActionLog.for`.
 *
 * - `resourceType` is stored with each action as its `resource_type`.
 * - `table` is where a `resource_id` of that kind points. Resource types and tables don't
 *   correspond one to one (a gift link's entry points at its post), so it can't be derived
 *   from the schema. The `Action` model builds a read model from it, so `include=resource`
 *   loads the resource.
 * - `actionNames` maps each name the kind may give an action, such as "reset", to the one
 *   event it always is. Something that sometimes adds and sometimes edits gets two names.
 *
 * Bookshelf models log their own actions and don't declare a kind.
 */
export interface ActionKind {
  resourceType: string;
  table: string;
  actionNames: Readonly<Record<string, ActionEvent>>;
}

type ActionName<K extends ActionKind> = Extract<keyof K['actionNames'], string>;

/** A change the kind names, such as a reset. Its event comes from the kind's declaration. */
interface NamedChange<K extends ActionKind> {
  actionName: ActionName<K>;
  event?: never;
}

/** A change that reads as its event alone, such as a field being added. */
interface PlainChange {
  event: ActionEvent;
  actionName?: never;
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
  /** How many resources changed, which Admin shows for more than one. */
  count: number;
}

/** What happened: one of the names `K` declares, or a plain added, edited or deleted. */
export type ActionChange<K extends ActionKind> = NamedChange<K> | PlainChange;

/** An action of kind `K` to log. */
export type ActionRow<K extends ActionKind> = ActionChange<K> &
  (SingleChange | BulkChange) & {
    /** Anything else stored with the action, such as a field's key. */
    context?: ExtraContext;
  };

/**
 * Logs staff actions to the `actions` table, which Admin's History page reads. A service's root
 * builds one and scopes it to the service's kind with `for`.
 */
export class ActionLog {
  private logging: Pick<GhostLogger, 'error'>;

  constructor({ logging }: { logging: Pick<GhostLogger, 'error'> }) {
    this.logging = logging;
  }

  /**
   * A writer for one kind's actions. It also gives the `Action` model a read model for the
   * kind's table, so call it at boot.
   */
  for<K extends ActionKind>(kind: K): KindLog<K> {
    register(kind);
    return new KindLog(kind, this.logging);
  }
}

/**
 * Logs one kind's actions.
 *
 * Call it from the command that makes the change, with the command's transaction where it has
 * one, so the action is only kept if the change is. Logging is best-effort: a failed write is
 * logged and doesn't fail the command, unless it deadlocks inside the command's transaction.
 */
export class KindLog<K extends ActionKind> {
  private kind: K;
  private logging: Pick<GhostLogger, 'error'>;

  constructor(kind: K, logging: Pick<GhostLogger, 'error'>) {
    this.kind = kind;
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
    row: ActionRow<K>,
  ): Promise<void> {
    const { actor } = context;
    if (!actor) {
      return;
    }
    const event = row.actionName === undefined ? row.event : this.kind.actionNames[row.actionName];
    try {
      await db('actions').insert({
        // ObjectIds increase over time, which readers rely on to order actions within a second.
        id: new ObjectID().toHexString(),
        resource_id: row.resourceId,
        resource_type: this.kind.resourceType,
        actor_id: actor.id,
        actor_type: actor.type,
        event,
        context: contextOf(row),
        created_at: toDatabaseDate(new Date()),
      });
    } catch (err) {
      // A deadlock rolls back the whole transaction, not just this insert, so the command's
      // own writes are gone too. Failing lets the command retry or report it, rather than
      // carry on as if its change was kept.
      if (db.isTransaction && isDeadlock(err)) {
        throw err;
      }
      this.logging.error(
        {
          event: { name: 'action_log.write_failed' },
          err,
          // Nested, as `event` is the log entry's own name.
          action: {
            resource_type: this.kind.resourceType,
            event,
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

// Registered at boot by each service's root, and read by the `Action` model on each query.
const registered = new Map<string, ActionKind>();

function register(kind: ActionKind): void {
  const existing = registered.get(kind.resourceType);
  if (existing && existing.table !== kind.table) {
    throw new errors.IncorrectUsageError({
      message: `The ${kind.resourceType} actions are declared twice, pointing at ${existing.table} and ${kind.table}.`,
    });
  }
  registered.set(kind.resourceType, kind);
}

/** The kinds services have logged through so far, which the `Action` model loads resources of. */
export function registeredKinds(): ActionKind[] {
  return [...registered.values()];
}

function isDeadlock(err: unknown): boolean {
  return (
    typeof err === 'object' && err !== null && 'code' in err && err.code === 'ER_LOCK_DEADLOCK'
  );
}

// Only the fields that carry meaning are stored, as Bookshelf's action log does.
function contextOf(row: ActionRow<ActionKind>): string {
  return JSON.stringify({
    ...(row.primaryName === undefined ? {} : { primary_name: row.primaryName }),
    ...withoutReservedKeys(row.context),
    ...(row.actionName === undefined ? {} : { action_name: row.actionName }),
    ...(row.count === undefined ? {} : { count: row.count }),
  });
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
