import ObjectID from 'bson-objectid';
import { z } from 'zod';
import type { Knex } from 'knex';
import type { GhostLogger } from '@tryghost/logging';
import { toDatabaseDate } from '../../lib/db-types/date';
import type { Change, ChangeEvent, ChangeEvents } from '../../lib/change-events';
import { ActionKind, type ActionName } from './kinds';

/**
 * How an event reads as an action.
 *
 * Admin's History page titles an action with its verb, or with its action name when it has
 * one, and shows a count above one as a bulk change.
 */
export interface ActionDescription<Name extends string> {
  /**
   * The name shown for the action. It is stored with the action so the action still makes
   * sense after its resource has been deleted.
   */
  name: string;
  /** The verb Admin shows, when it isn't the event's own change. */
  verb?: Change;
  /** A name for what happened, such as "reset" or "installed", shown in place of the verb. */
  actionName?: Name;
  /** Anything else stored with the action, such as a field's key. */
  details?: Record<string, unknown>;
}

const ActionRow = z.object({
  id: z.string(),
  resource_id: z.string().max(24).nullable(),
  resource_type: ActionKind,
  actor_id: z.string().max(24),
  actor_type: z.enum(['user', 'integration']),
  event: z.string().max(50),
  context: z.string(),
  created_at: z.string(),
});

declare module 'knex/types/tables' {
  interface Tables {
    // Bookshelf models log actions with their own resource types, so a row that is read back
    // can have any type. Only new rows are limited to the action log's kinds.
    actions: Knex.CompositeTableType<
      Omit<z.output<typeof ActionRow>, 'resource_type'> & { resource_type: string },
      z.output<typeof ActionRow>,
      never
    >;
  }
}

/**
 * The object an event is about: as it is after the change, or as it was before a delete.
 * Null for a batch, which carries no objects.
 */
function snapshotOf<T>(event: ChangeEvent<T>): T | null {
  if ('count' in event) {
    return null;
  }
  return 'next' in event ? event.next : event.previous;
}

/** What logging an action needs. */
export interface ActionLogDependencies {
  knex: Knex;
  logging: Pick<GhostLogger, 'error'>;
}

/** Logs one kind of action from a domain's change events. */
export interface ActionLog<K extends ActionKind, Event extends ChangeEvent> {
  /** Logs each of the domain's events as an action of `kind`, from now on. */
  listen: (
    dependencies: ActionLogDependencies,
    kind: K,
    events: Pick<ChangeEvents<Event>, 'react'>,
  ) => void;
}

/**
 * Creates the action log for one kind of action.
 *
 * An action's verb is the event's change and its resource is the object the event is about. A
 * bulk change stores how many objects it covers. `describe` says how each event reads: its name,
 * and the verb or one of the kind's action names when the event needs its own wording. As with
 * Bookshelf's actions, only what applies is stored.
 *
 * Logging is best-effort: an action that can't be logged is logged as an error, naming the
 * action, and the change it describes stands.
 */
export function createActionLog<K extends ActionKind, T, Event extends ChangeEvent<T>>({
  idOf,
  describe,
}: {
  /** The id the action's resource is loaded by, from the kind's table. */
  idOf: (resource: T, event: Event) => string;
  describe: (event: Event) => ActionDescription<ActionName<K>>;
}): ActionLog<K, Event> {
  return {
    listen: ({ knex, logging }, kind, events) => {
      events.react(async (actor, event) => {
        const resource = snapshotOf<T>(event);
        const resourceId = resource === null ? null : idOf(resource, event);
        try {
          const { name, verb, actionName, details } = describe(event);
          await knex('actions').insert(
            ActionRow.parse({
              id: new ObjectID().toHexString(),
              resource_id: resourceId,
              resource_type: kind,
              actor_id: actor.id,
              actor_type: actor.type,
              event: verb ?? event.change,
              context: JSON.stringify({
                ...details,
                primary_name: name,
                ...(actionName === undefined ? {} : { action_name: actionName }),
                ...('count' in event ? { count: event.count } : {}),
              }),
              created_at: toDatabaseDate(new Date()),
            }),
          );
        } catch (err) {
          logging.error(
            {
              event: { name: 'action_log.write_failed' },
              err,
              actionKind: kind,
              resourceId,
              changeEvent: event.type,
              actorType: actor.type,
              actorId: actor.id,
            },
            'An action could not be logged',
          );
        }
      });
    },
  };
}
