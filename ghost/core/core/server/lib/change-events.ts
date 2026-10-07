import logging from '@tryghost/logging';
import type { Actor } from './actor';

/** The ways a command can change a domain object. */
export type Change = 'added' | 'edited' | 'deleted';

/**
 * What an added, edited or deleted event carries beyond the object itself: anything else it
 * needs that the object doesn't hold, such as the manifests an approval moved between. Most
 * events carry nothing extra.
 */
type NoExtra = Record<never, never>;

/** A domain object was added. `next` is the object as it was added. */
export type Added<Type extends string, T, Extra extends object = NoExtra> = {
  type: Type;
  change: 'added';
  next: T;
} & Extra;

/** A domain object was edited, from `previous` to `next`. */
export type Edited<Type extends string, T, Extra extends object = NoExtra> = {
  type: Type;
  change: 'edited';
  previous: T;
  next: T;
} & Extra;

/** A domain object was deleted. `previous` is the object as it was before. */
export type Deleted<Type extends string, T, Extra extends object = NoExtra> = {
  type: Type;
  change: 'deleted';
  previous: T;
} & Extra;

/** One command changed many domain objects in the same way. Only how many is known. */
export interface Batch<Type extends string, C extends Change> {
  type: Type;
  change: C;
  count: number;
}

/**
 * An event a command raises once its change is saved, about domain objects of type `T`.
 *
 * `type` is the domain's own name for what happened, such as "AppInstalled". `change` says
 * which kind of change it was, so a reaction can handle any domain's events without knowing
 * their names.
 */
export type ChangeEvent<T = unknown> =
  | Added<string, T>
  | Edited<string, T>
  | Deleted<string, T>
  | Batch<string, Change>;

/**
 * The object an event is about: as it is after the change, or as it was before a delete.
 * Null for a batch, which carries no objects.
 */
export function snapshotOf<T>(event: ChangeEvent<T>): T | null {
  if ('count' in event) {
    return null;
  }
  return 'next' in event ? event.next : event.previous;
}

/** How many domain objects an event is about. */
export function countOf(event: ChangeEvent): number {
  return 'count' in event ? event.count : 1;
}

/** Reacts to an event, once the change it describes is saved. */
export type Reaction<Event extends ChangeEvent> = (actor: Actor, event: Event) => Promise<void>;

/** A domain's change events: its commands raise them, and other domains react to them. */
export interface ChangeEvents<Event extends ChangeEvent> {
  /**
   * Raises an event to every reaction, one after another, waiting for each.
   *
   * A reaction that fails is logged and the rest still run, so raising never fails the command.
   * A command raises its events after its transaction commits, so a reaction never sees a
   * change that was rolled back.
   */
  raise: (actor: Actor, event: Event) => Promise<void>;
  /** Adds a reaction to every event raised from now on. */
  react: (reaction: Reaction<Event>) => void;
}

/** Creates a domain's change events, with nothing reacting to them yet. */
export function createChangeEvents<Event extends ChangeEvent>(): ChangeEvents<Event> {
  const reactions: Reaction<Event>[] = [];
  return {
    raise: async (actor, event) => {
      for (const react of reactions) {
        try {
          await react(actor, event);
        } catch (err) {
          logging.error(
            { event: { name: 'change-events.react.failed' }, err, changeEvent: event.type },
            'A reaction to a change event failed',
          );
        }
      }
    },
    react: (reaction) => {
      reactions.push(reaction);
    },
  };
}
