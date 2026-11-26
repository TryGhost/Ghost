import errors from '@tryghost/errors';
import { z } from 'zod';
import schema, { type TableName } from '../../../data/schema/schema';
import type {
  DB_METAFIELD_COLUMNS,
  DbMetafieldBinding,
  DbMetafieldChangeEvent,
  DbMetafieldValue,
} from './schema';

type Schema = typeof schema;

/** A resource's metafield tables, each named after the resource's own table. */
export type MetafieldTables<N extends string> = {
  /** The fields defined on this resource. */
  fields: `${N}_metafields`;
  /** What each member or post holds for each field: a row per part of a value. */
  values: `${N}_metafield_values`;
  /** Which field each port another domain declares writes into. */
  bindings: `${N}_metafield_bindings`;
  /** An entry for each write of a member's or post's values: who wrote which fields, and where. */
  changes: `${N}_metafield_change_events`;
};

/**
 * The columns the core reads from each of a resource's tables, from the row schemas it reads them
 * with. The id column the values reference the resource by is checked apart, as its name differs
 * by resource.
 */
type ColumnsRead = {
  fields: keyof typeof DB_METAFIELD_COLUMNS | 'type' | 'settings' | 'sort_order';
  values: keyof typeof DbMetafieldValue.shape;
  bindings: keyof typeof DbMetafieldBinding.shape;
  changes: keyof typeof DbMetafieldChangeEvent.shape;
};

/** Whether the schema defines `Table` with every one of `Columns`. */
type HasColumns<Table extends string, Columns extends string> = Table extends TableName
  ? [Exclude<Columns, keyof Schema[Table]>] extends [never]
    ? true
    : false
  : false;

/** Whether the schema defines each of a resource's metafield tables with the columns the core reads. */
type HasMetafieldTables<N extends string> = {
  [T in keyof ColumnsRead]: HasColumns<MetafieldTables<N>[T], ColumnsRead[T]>;
}[keyof ColumnsRead];

/** The column of `Table` whose foreign key references `${Target}.id`, if it has one. */
type ForeignKeyTo<Table extends TableName, Target extends string> = {
  [Column in keyof Schema[Table] & string]: Schema[Table][Column] extends {
    references: `${Target}.id`;
  }
    ? Column
    : never;
}[keyof Schema[Table] & string];

/**
 * The tables that can hold metafields, read from `schema.ts`: each one the schema defines all four
 * metafield tables for, with the columns the core reads, and whose values reference it by a
 * foreign key. A name the schema doesn't give those tables doesn't compile, and neither does
 * members once a column the core reads is dropped from one of them.
 */
export type ResourceName = {
  [N in TableName]: [HasMetafieldTables<N>] extends [true]
    ? MetafieldTables<N>['values'] extends infer Values extends TableName
      ? [ForeignKeyTo<Values, N>] extends [never]
        ? never
        : N
      : never
    : never;
}[TableName];

/** The column of a resource's values that references the resource, such as `member_id`. */
export type ForeignKeyOf<N extends ResourceName> = ForeignKeyTo<MetafieldTables<N>['values'], N>;

/** What one of a resource's records is called, from its foreign key: `member_id` gives `member`. */
type RecordNameOf<N extends ResourceName> = ForeignKeyOf<N> extends `${infer One}_id` ? One : never;

/**
 * The name the action log and the permissions record a resource's definitions under, from its
 * foreign key: `member_id` gives `member_custom_field`.
 */
export type DefinitionsType<N extends ResourceName = ResourceName> =
  `${RecordNameOf<N>}_custom_field`;

/**
 * A kind of thing that holds metafields, such as members or posts, and the tables its fields and
 * values are kept in. Each resource has tables of its own rather than sharing one, so a value can
 * reference its member or post with a real foreign key. Declared by its name alone, with
 * `metafieldResource`: everything else follows from the schema.
 */
export interface MetafieldResource<N extends ResourceName = ResourceName> {
  name: N;
  tables: MetafieldTables<N>;
  /** The column of the values that references the member or post, such as `member_id`. */
  foreignKey: ForeignKeyOf<N>;
  /** The name its definitions are logged and permitted under, such as `member_custom_field`. */
  definitionsType: DefinitionsType<N>;
  /**
   * The member a record belongs to. On a resource whose values reference members, the record is
   * the member. On any other resource no member owns a record, so a policy's `member` reaches
   * none of them.
   */
  memberOf(resourceId: string): string | null;
}

/** The part of a column's definition that says which table's id it references, if any. */
const ForeignKey = z.object({ references: z.string().optional() });

/** Every table's columns, by name, as `schema.ts` defines them. */
const tablesByName: Record<string, Record<string, unknown> | undefined> = schema;

/** How a foreign key ends: `member_id` references a member. */
const ID_SUFFIX = '_id';

/** Whether `column` of `table` references `${target}.id`, read from the schema. */
function references(table: string, column: string, target: string): boolean {
  const definition = tablesByName[table]?.[column];
  return ForeignKey.safeParse(definition).data?.references === `${target}.id`;
}

/** Declares a resource by its name. Its tables and foreign key follow from the schema. */
export function metafieldResource<N extends ResourceName>(name: N): MetafieldResource<N> {
  const tables: MetafieldTables<N> = {
    fields: `${name}_metafields`,
    values: `${name}_metafield_values`,
    bindings: `${name}_metafield_bindings`,
    changes: `${name}_metafield_change_events`,
  };
  const columns = Object.keys(tablesByName[tables.values] ?? {});
  const foreignKey = columns.find((column): column is ForeignKeyOf<N> =>
    references(tables.values, column, name),
  );
  // The type allows only names whose values reference the resource, so this holds for any name
  // that compiled.
  if (foreignKey === undefined) {
    throw new errors.IncorrectUsageError({
      message: `${tables.values} has no foreign key to ${name}.`,
    });
  }
  // What a record is called is the foreign key without `_id`, checked against the key so the type
  // it is read as holds.
  const recordName = foreignKey.slice(0, -ID_SUFFIX.length);
  const isRecordName = (candidate: string): candidate is RecordNameOf<N> =>
    `${candidate}${ID_SUFFIX}` === foreignKey;
  if (!isRecordName(recordName)) {
    throw new errors.IncorrectUsageError({
      message: `${tables.values}.${foreignKey} isn't named after the record it references.`,
    });
  }
  const ofMembers = columns.some((column) => references(tables.values, column, 'members'));
  return {
    name,
    tables,
    foreignKey,
    definitionsType: `${recordName}_custom_field`,
    memberOf: (resourceId) => (ofMembers ? resourceId : null),
  };
}
