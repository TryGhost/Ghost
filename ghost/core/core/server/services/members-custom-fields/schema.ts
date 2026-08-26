import { z } from 'zod';
import type { Knex } from 'knex';
import { FieldTypeSchema } from '@tryghost/custom-field-types';
import { DbDate } from '../../lib/db-types/date';

// `archived` is soft: the field drops out of the values path but stays in the definition
// list so it can be renamed, restored or deleted. Mirrors schema.js's `isIn` on the
// column, which is static config and cannot import this.
export const FIELD_STATUS = { active: 'active', archived: 'archived' } as const;
export type FieldStatus = (typeof FIELD_STATUS)[keyof typeof FIELD_STATUS];
export const FieldStatusSchema = z.enum([FIELD_STATUS.active, FIELD_STATUS.archived]);

// The single source for the read projection and the knex table type below. `type` parses
// as the field-type enum, so the row carries the narrow type and no codec needs a cast.
export const DbCustomField = z.object({
  id: z.string(),
  key: z.string(),
  name: z.string(),
  type: FieldTypeSchema,
  status: FieldStatusSchema,
  created_at: DbDate,
  updated_at: DbDate.nullable(),
});

// Storage only: order is a fact about the list, so no read projection carries a rank.
type CustomFieldRank = { sort_order: number };

type CustomFieldRow = z.infer<typeof DbCustomField> & CustomFieldRank;

/**
 * How a value arrived, not who caused it: who edited a member's fields is already an
 * action, and Stripe is not a person. Open rather than a closed list, so a new integration
 * does not have to be added to a central enumeration.
 */
export const WRITTEN_BY = {
  binding: 'binding',
  user: 'user',
  integration: 'integration',
  import: 'import',
} as const;

export const WrittenBy = z.object({
  type: z.string(),
  /** Absent for a writer with no identity to give: an import, until runs are tracked. */
  id: z.string().nullable(),
});
export type WrittenBy = z.infer<typeof WrittenBy>;

// One part of a member's value. What a `path` means is storage.ts's business, so the row
// carries it as a plain string.
export const DbCustomFieldValue = z.object({
  id: z.string(),
  custom_field_key: z.string(),
  member_id: z.string(),
  path: z.string(),
  // Nullable like the column, though nothing here writes a null: a part with no value
  // has no row.
  value_text: z.string().nullable(),
  // Nullable only for rows written before the columns existed; every write states a type.
  written_by_type: z.string().nullable(),
  written_by_id: z.string().nullable(),
  created_at: DbDate,
  updated_at: DbDate.nullable(),
});

type CustomFieldValueRow = z.infer<typeof DbCustomFieldValue>;

// The field's key travels with the row so a value assembles without a second lookup.
//
// `type` takes no part in the assembly and is here as a gate: a value whose type has left
// the catalog is one the definitions list no longer returns either, so failing to parse
// is what drops it.
export const DbCustomFieldLeaf = z.object({
  member_id: z.string(),
  key: z.string(),
  type: FieldTypeSchema,
  path: z.string(),
  value_text: z.string(),
});

declare module 'knex/types/tables' {
  interface Tables {
    members_custom_fields: Knex.CompositeTableType<
      CustomFieldRow,
      // `status` is DB-defaulted and only set via update, so it's absent here. The
      // rank is required: letting it default would land a new field at the top.
      Omit<z.input<typeof DbCustomField>, 'updated_at' | 'status'> & CustomFieldRank,
      Partial<CustomFieldRow>
    >;
    members_custom_field_values: Knex.CompositeTableType<
      CustomFieldValueRow,
      Omit<z.input<typeof DbCustomFieldValue>, 'updated_at'>,
      Partial<CustomFieldValueRow>
    >;
  }
}
