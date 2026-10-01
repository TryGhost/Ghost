import type { Surface } from './access';
import type { WriteOrigin, WrittenBy } from './schema';

export type WriterType = WrittenBy['type'];

/**
 * An entity whose records carry metafields.
 *
 * Every entity stores its metafields in tables of its own, named after its table and
 * holding the shape `schema.ts` declares for every entity: the definitions, one row per
 * part of a value, and a history of writes. The tables have to exist before an entity can
 * be described here; nothing creates them on demand.
 *
 * What differs between entities is what is said about them below, and nothing else.
 */
export interface MetafieldEntity<
  Table extends string = string,
  Writer extends WriterType = WriterType,
  S extends Surface = Surface,
> {
  /** The entity's own table, which its metafield tables are named after. */
  readonly table: Table;
  /** The column the values and history tables reference a record by, cascading on delete. */
  readonly foreignKey: string;
  /** Everyone who may write a record's values. A write naming anyone else does not compile. */
  readonly writers: readonly Writer[];
  /**
   * The doors a field is opened to one at a time. Each is a column on the definitions
   * table, so a door the entity has no column for reaches none of its fields.
   */
  readonly surfaces: readonly S[];
  /**
   * What a definition is called by the action log and by the permissions guarding who may
   * change one. One name for both, because a permission check and the entry recording what
   * it allowed are about the same thing.
   */
  readonly definitionResource: string;
}

/** Infers the narrowest description from a literal, so the writers it lists become its type. */
export function metafieldEntity<
  const Table extends string,
  const Writer extends WriterType,
  const S extends Surface,
>(entity: MetafieldEntity<Table, Writer, S>): MetafieldEntity<Table, Writer, S> {
  return entity;
}

export type WriterOf<E extends MetafieldEntity> = E['writers'][number];

/** The writes an entity can record: who wrote, and where, narrowed to its writers. */
export type OriginOf<E extends MetafieldEntity> = Extract<
  WriteOrigin,
  { writtenBy: { type: WriterOf<E> } }
>;

/**
 * The tables an entity's metafields live in. Derived rather than listed, so no entity can
 * name its tables in a way the declaration in `schema.ts` would not recognise.
 */
export function metafieldTables<Table extends string>(table: Table) {
  return {
    definitions: `${table}_metafields`,
    values: `${table}_metafield_values`,
    changeEvents: `${table}_metafield_change_events`,
  } as const;
}
