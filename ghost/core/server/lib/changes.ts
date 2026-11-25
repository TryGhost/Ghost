// The classes a service extends to say what a command changed, in the service's own terms.
//
// A change has two layers. `verb` is what happened to the object the service owns: it was added,
// edited or deleted. `type` is the service's own name for what happened, such as "GiftLinkReset".
// Whoever is told can handle any edit by its verb without knowing a service's names, or one kind
// of change by its type.
//
// The name decides the verb, so a service declares each change once, as a class that extends the
// verb's class and gives it the change's name:
//
//     export class SegmentRenamed extends Edited('SegmentRenamed')<Segment> {}
//
// A command then only names the change it made: `new SegmentRenamed(previous, next)`.
//
// A change holds data and nothing else. Whoever is told reads its `type` and `verb`, and never
// asks `instanceof`, so a change is read the same way once it has been stored and read back, or
// when the module that declares it has been loaded twice.
//
// A service reports a change by calling a function it is given, inside the command's
// transaction, so whatever that function writes is saved with the change. Nothing is published
// or subscribed to.

import type { Knex } from 'knex';
import type { RequestContext } from './actor';

/** What a command did to a domain object. */
export type Verb = 'added' | 'edited' | 'deleted';

/**
 * The class a change named `type` extends when a domain object was added. `next` is the object
 * as it was added.
 */
export function Added<Type extends string>(type: Type) {
  return class<T> {
    readonly type = type;
    readonly verb = 'added';
    readonly next: T;

    constructor(next: T) {
      this.next = next;
    }
  };
}

/**
 * The class a change named `type` extends when a domain object was edited, from `previous` to
 * `next`.
 */
export function Edited<Type extends string>(type: Type) {
  return class<T> {
    readonly type = type;
    readonly verb = 'edited';
    readonly previous: T;
    readonly next: T;

    constructor(previous: T, next: T) {
      this.previous = previous;
      this.next = next;
    }
  };
}

/**
 * The class a change named `type` extends when a domain object was deleted. `previous` is the
 * object as it was before.
 */
export function Deleted<Type extends string>(type: Type) {
  return class<T> {
    readonly type = type;
    readonly verb = 'deleted';
    readonly previous: T;

    constructor(previous: T) {
      this.previous = previous;
    }
  };
}

/**
 * The class a change named `type` extends when one command changed many domain objects. A batch
 * is an envelope: it has a name of its own and holds the change to each object, in the order
 * they were made, each with its own verb. Whoever is told knows it was one act before deciding
 * what to do about each object, or about all of them at once.
 */
export function Batch<Type extends string>(type: Type) {
  return class<Each extends { verb: Verb }> {
    readonly type = type;
    readonly changes: Each[];

    constructor(changes: Each[]) {
      this.changes = changes;
    }
  };
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
