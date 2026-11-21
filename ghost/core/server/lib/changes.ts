// The shapes a service uses to say what a command changed, in the service's own terms.
//
// A change has two layers. `verb` is what happened to the object the service owns: it was added,
// edited or deleted. `type` is the service's own name for what happened, such as "GiftLinkReset".
// Whoever is told can handle any edit by its verb without knowing a service's names, or one kind
// of change by its type.
//
// A service reports a change by calling a function it is given, inside the command's
// transaction, so whatever that function writes is saved with the change. Nothing is published
// or subscribed to.

import type { Knex } from 'knex';
import type { RequestContext } from './actor';

/** What a command did to a domain object. */
export type Verb = 'added' | 'edited' | 'deleted';

/**
 * What a change carries beyond the object itself: anything else it needs that the object
 * doesn't hold, such as the id of the row a config is stored in. Most changes carry nothing
 * extra.
 */
type NoExtra = Record<never, never>;

/** A domain object was added. `next` is the object as it was added. */
export type Added<Type extends string, T, Extra extends object = NoExtra> = {
  type: Type;
  verb: 'added';
  next: T;
} & Extra;

/** A domain object was edited, from `previous` to `next`. */
export type Edited<Type extends string, T, Extra extends object = NoExtra> = {
  type: Type;
  verb: 'edited';
  previous: T;
  next: T;
} & Extra;

/** A domain object was deleted. `previous` is the object as it was before. */
export type Deleted<Type extends string, T, Extra extends object = NoExtra> = {
  type: Type;
  verb: 'deleted';
  previous: T;
} & Extra;

/**
 * One command changed many domain objects. A batch is an envelope: it has a name of its own and
 * holds the change to each object, in the order they were made, each with its own verb. Whoever
 * is told knows it was one act before deciding what to do about each object, or about all of
 * them at once.
 */
export interface Batch<Type extends string, Each extends { verb: Verb }> {
  type: Type;
  changes: Each[];
}

/**
 * The function a service calls with each change a command makes. The service declares which
 * changes it reports, and its root supplies the function, so the service knows nothing about who
 * is told or what they do with a change.
 *
 * The function is called inside the command's transaction, after the change is written. What it
 * writes through `trx` is saved with the change, and if it throws, the command fails and the
 * change is rolled back.
 */
export type OnUpdated<Reported> = (
  trx: Knex.Transaction,
  context: RequestContext,
  change: Reported,
) => Promise<void>;
