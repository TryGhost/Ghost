import ObjectID from 'bson-objectid';
import { z } from 'zod';
import type { Knex } from 'knex';
import { toDatabaseDate } from '../../lib/db-types/date';
import {
  countOf,
  snapshotOf,
  type Change,
  type ChangeEvent,
  type ChangeEvents,
} from '../../lib/change-events';
import { ActionKind } from './kinds';

/**
 * How an event reads as an action.
 *
 * Admin's History page titles an action with its verb, or with its action name when it has
 * one, and shows a count above one as a bulk change.
 */
export interface ActionDescription {
  /**
   * The name shown for the action. It is stored with the action so the action still makes
   * sense after its resource has been deleted.
   */
  name: string;
  /** The verb Admin shows, when it isn't the event's own change. */
  verb?: Change;
  /** A name for what happened, such as "reset" or "installed", shown in place of the verb. */
  actionName?: string;
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

/** Logs one kind of action, once it is listening. */
export interface ActionLog {
  /** Logs each of the domain's events as an action of `kind`, from now on. */
  listen: (knex: Knex, kind: ActionKind) => void;
}

/**
 * Creates the action log for one kind of action, from the change events of the domain it
 * logs.
 *
 * An action's verb is the event's change, its resource is the object the event is about, and
 * its count is how many objects the event covers. `describe` says how each event reads: its
 * name, and the verb or action name when the event needs its own wording.
 */
export function createActionLog<T, Event extends ChangeEvent<T>>({
  events,
  idOf,
  describe,
}: {
  events: ChangeEvents<Event>;
  /** The id the action's resource is loaded by, from the kind's table. */
  idOf: (resource: T, event: Event) => string;
  describe: (event: Event) => ActionDescription;
}): ActionLog {
  return {
    listen: (knex, kind) =>
      events.react(async (actor, event) => {
        const resource = snapshotOf<T>(event);
        const { name, verb, actionName, details } = describe(event);
        await knex('actions').insert(
          ActionRow.parse({
            id: new ObjectID().toHexString(),
            resource_id: resource === null ? null : idOf(resource, event),
            resource_type: kind,
            actor_id: actor.id,
            actor_type: actor.type,
            event: verb ?? event.change,
            context: JSON.stringify({
              ...details,
              primary_name: name,
              count: countOf(event),
              action_name: actionName ?? null,
            }),
            created_at: toDatabaseDate(new Date()),
          }),
        );
      }),
  };
}
