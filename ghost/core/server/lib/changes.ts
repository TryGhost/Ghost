// The shapes a service uses to say what a command changed, in the service's own terms.
//
// `type` is the service's name for what happened, such as "GiftLinkReset". `change` says which
// kind of change it was, so whoever is told can handle a change without knowing its name.
//
// A service tells of a change by calling a function it is given, inside the command's
// transaction, so whatever that function writes is saved with the change. Nothing is published
// or subscribed to.

/** The ways a command can change a domain object. */
export type Change = 'added' | 'edited' | 'deleted';

/**
 * What a change carries beyond the object itself: anything else it needs that the object
 * doesn't hold, such as the id of the row a config is stored in. Most changes carry nothing
 * extra.
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

/**
 * One command changed many domain objects in the same way. `changes` holds the change to each,
 * in the order they were made, so whoever is told knows it was one act before deciding what to do
 * about each object, or about all of them at once.
 */
export interface Batch<Type extends string, Each extends { change: Change }> {
  type: Type;
  change: Each['change'];
  changes: Each[];
}
