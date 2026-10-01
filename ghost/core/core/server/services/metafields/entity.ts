import errors from '@tryghost/errors';
import { SURFACES, type Surface } from './access';

/**
 * An entity whose records carry metafields, as its tables in the schema describe it.
 *
 * Nothing here is declared by hand. An entity has metafields when the schema has its three
 * metafield tables, named after its own table, and everything else is read off them, so a
 * description can never disagree with the tables it describes.
 */
export interface MetafieldEntity {
  /** The entity's own table, which its metafield tables are named after. */
  readonly table: string;
  /** The column its values and history reference a record by. */
  readonly foreignKey: string;
  /** The doors a field can be opened to one at a time: the access columns its definitions carry. */
  readonly surfaces: readonly Surface[];
  /**
   * What a definition is called by the permissions guarding it and by the action log:
   * `member_custom_field` for members.
   */
  readonly definitionResource: string;
}

/** The tables an entity's metafields live in, named after its own table. */
export function metafieldTables<Table extends string>(table: Table) {
  return {
    definitions: `${table}_metafields`,
    values: `${table}_metafield_values`,
    changeEvents: `${table}_metafield_change_events`,
  } as const;
}

/** A column as schema.js declares it; only where it points is read here. */
type ColumnSpec = { readonly [property: string]: unknown };
type SchemaTables = Record<string, Record<string, ColumnSpec>>;

function schemaTables(): SchemaTables {
  return require('../../data/schema').tables;
}

function hasMetafieldTables(tables: SchemaTables, table: string): boolean {
  return Object.values(metafieldTables(table)).every((name) => Object.hasOwn(tables, name));
}

function cannotCarryMetafields(table: string, reason: string): never {
  throw new errors.IncorrectUsageError({
    message: `${table} cannot carry metafields: ${reason}.`,
  });
}

/** The column in `spec` pointing at a record of `table`, if exactly one does. */
function referenceTo(table: string, spec: Record<string, ColumnSpec>): string | undefined {
  const columns = Object.entries(spec)
    .filter(([, column]) => column?.references === `${table}.id`)
    .map(([name]) => name);
  return columns.length === 1 ? columns[0] : undefined;
}

/**
 * Reads an entity's metafields off its tables in the schema. Throws when the entity has
 * no metafield tables, or when they do not agree on how they point back at its records.
 */
export function describeMetafieldEntity(table: string, tables = schemaTables()): MetafieldEntity {
  if (!hasMetafieldTables(tables, table)) {
    cannotCarryMetafields(table, 'the schema has no metafield tables for it');
  }

  const names = metafieldTables(table);
  const foreignKey = referenceTo(table, tables[names.values]);
  if (foreignKey === undefined || referenceTo(table, tables[names.changeEvents]) !== foreignKey) {
    cannotCarryMetafields(
      table,
      `${names.values} and ${names.changeEvents} must each reference ${table}.id from one column of the same name`,
    );
  }

  const surfaces = (Object.keys(SURFACES) as Surface[]).filter((surface) =>
    Object.hasOwn(tables[names.definitions], SURFACES[surface].column),
  );

  return {
    table,
    foreignKey,
    surfaces,
    // Named after the record the way the schema names it, by the column pointing at one.
    definitionResource: `${foreignKey.replace(/_id$/, '')}_custom_field`,
  };
}

/** Every entity the schema gives metafield tables to. */
export function metafieldEntities(tables = schemaTables()): MetafieldEntity[] {
  return Object.keys(tables)
    .filter((table) => hasMetafieldTables(tables, table))
    .map((table) => describeMetafieldEntity(table, tables));
}
