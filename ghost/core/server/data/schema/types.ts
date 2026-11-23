// Shapes of the column and table definitions in schema.ts, as migration helpers accept them.

import type { PatternColumn } from './lib/column-patterns';
import type { ForeignKeyColumn, ForeignKeySpec } from './lib/foreign-keys';
import type { SortableDefinition } from './lib/sortable';

export interface ColumnValidations {
  isUUID?: boolean;
  isIn?: [readonly string[]];
  isLength?: { min?: number; max?: number };
  isEmail?: boolean;
  isEmptyOrURL?: boolean;
  isLowercase?: boolean;
  matches?: RegExp | string;
}

interface BaseColumn<Default> {
  nullable?: boolean;
  primary?: boolean;
  unique?: boolean;
  index?: boolean;
  defaultTo?: Default | null;
  validations?: ColumnValidations;
}

// Foreign key and pattern options come from the schemas that read them.
export interface StringColumn extends BaseColumn<string>, ForeignKeyColumn, PatternColumn {
  type: 'string';
  /** Defaults to 191 */
  maxlength?: number;
}

export interface TextColumn extends BaseColumn<string> {
  type: 'text';
  fieldtype?: 'medium' | 'long';
  maxlength?: number;
}

export interface BooleanColumn extends BaseColumn<boolean> {
  type: 'boolean';
}

export interface IntegerColumn extends BaseColumn<number> {
  type: 'integer' | 'bigInteger';
  unsigned?: boolean;
}

export interface DateTimeColumn extends BaseColumn<string> {
  type: 'dateTime';
  precision?: number;
}

export interface BinaryColumn extends BaseColumn<never> {
  type: 'binary';
  maxlength?: number;
}

export type ColumnDefinition =
  | StringColumn
  | TextColumn
  | BooleanColumn
  | IntegerColumn
  | DateTimeColumn
  | BinaryColumn;

/** Columns alone, or the object form for a MySQL prefix index or a name under MySQL's 64-character limit */
export type IndexDefinition =
  | string
  | string[]
  | { columns: string[]; length?: number; indexName?: string };

export type UniqueConstraintDefinition =
  | string
  | string[]
  | { columns: string[]; indexName?: string };

type TableOptions = {
  '@@INDEXES@@'?: IndexDefinition[];
  '@@UNIQUE_CONSTRAINTS@@'?: UniqueConstraintDefinition[];
  '@@PRIMARY_KEY@@'?: string[];
  /** Composite foreign keys; a single-column one goes on the column as `references` */
  '@@FOREIGN_KEYS@@'?: ForeignKeySpec[];
  /** The sortable collections in the table. Declares how they are ordered; changes no SQL. */
  '@@SORTABLE@@'?: SortableDefinition[];
};

export type TableDefinition = TableOptions & {
  [column: string]: ColumnDefinition | TableOptions[keyof TableOptions];
};

export interface ColumnMigrationOptions {
  /** MySQL only */
  algorithm?: 'instant' | 'inplace' | 'copy' | 'auto';
}
