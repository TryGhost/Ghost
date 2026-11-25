import { Added, Batch, Deleted, Edited, type OnUpdated } from '../../../lib/changes';
import type { Namespace } from '@tryghost/metafield-types/identity';
import type { Knex } from 'knex';
import type { MetafieldChangeEventField } from '@tryghost/metafield-types';
import type { Definition } from './models';
import type { WriteOrigin } from './schema';

/** A definition was added, as one of the definitions a request added together. */
export class DefinitionAdded extends Added('DefinitionAdded')<Definition> {}

/** Definitions were added together, by one request. `changes` holds each, in the order given. */
export class DefinitionsAdded extends Batch('DefinitionsAdded')<DefinitionAdded> {}

/**
 * A definition was edited, from the definition as it was to the definition as it is now. One
 * edit can rename it, change its type's settings, change what members may do with it, and
 * archive or restore it. Comparing `previous` with `next` says which. An edit that changes
 * nothing is not reported.
 */
export class DefinitionEdited extends Edited('DefinitionEdited')<Definition> {}

/** The definition was deleted for good, along with every value held for it. */
export class DefinitionDeleted extends Deleted('DefinitionDeleted')<Definition> {}

/**
 * A namespace's definitions were put in a new order. Each list is every definition in the
 * namespace, in the order it had.
 */
export class DefinitionsReordered extends Edited('DefinitionsReordered')<Definition[]> {
  /** The namespace whose definitions were put in order. */
  readonly namespace: Namespace;

  constructor(namespace: Namespace, previous: Definition[], next: Definition[]) {
    super(previous, next);
    this.namespace = namespace;
  }
}

/**
 * A change a command made to a resource's definitions, in general terms. Each command makes one
 * change, however much of a definition it touched. Which resource and namespace it was made in
 * is for whoever is told to read from the definitions, as the resource is the one they are told
 * by.
 */
export type DefinitionChange =
  | DefinitionsAdded
  | DefinitionEdited
  | DefinitionDeleted
  | DefinitionsReordered;

/** The function the definitions service calls with each change it makes. */
export type OnDefinitionUpdated = OnUpdated<DefinitionChange>;

/**
 * One write of a member's or post's values, naming the fields it wrote and who wrote them, from
 * where. It is the change to the member or post, so the resource decides how it is recorded.
 */
export class ValuesWritten {
  readonly type = 'ValuesWritten';
  readonly resourceId: string;
  readonly origin: WriteOrigin;
  readonly fields: MetafieldChangeEventField[];
  readonly at: Date;

  constructor({
    resourceId,
    origin,
    fields,
    at,
  }: {
    resourceId: string;
    origin: WriteOrigin;
    fields: MetafieldChangeEventField[];
    at: Date;
  }) {
    this.resourceId = resourceId;
    this.origin = origin;
    this.fields = fields;
    this.at = at;
  }
}

/**
 * The function the values service calls with each write, inside the write's transaction. The
 * write names who made it in its origin, which says more than a request context can: a value can
 * be written by a binding or an import as well as by someone acting.
 */
export type OnValuesWritten = (trx: Knex.Transaction, change: ValuesWritten) => Promise<void>;
