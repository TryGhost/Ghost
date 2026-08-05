import {z} from 'zod';
import type {Knex} from 'knex';
import {FieldTypeSchema} from '@tryghost/custom-field-types';
import {DbDate} from '../../lib/db-date';

// `archived` is soft: the field drops out of the values path but stays in the definition
// list so it can be renamed, restored or deleted. Mirrors schema.js's `isIn` on the
// column, which is static config and cannot import this.
export const FIELD_STATUS = {active: 'active', archived: 'archived'} as const;
export type FieldStatus = typeof FIELD_STATUS[keyof typeof FIELD_STATUS];
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
    updated_at: DbDate.nullable()
});

// Where the field sits in the publisher's order.
//
// Deliberately outside the projection above: order is a fact about the list, not about
// any one field, so nothing that reads a definition ever sees a rank — a selected row
// carries the column and the parse above drops it. It is declared here, with the write
// shapes, because writing and ordering by it is all anything does with it.
type CustomFieldRank = {sort_order: number};

type CustomFieldRow = z.infer<typeof DbCustomField> & CustomFieldRank;

// One part of a member's value. What a `path` means is storage.ts's business, so the row
// carries it as a plain string.
export const DbCustomFieldValue = z.object({
    id: z.string(),
    custom_field_id: z.string(),
    member_id: z.string(),
    path: z.string(),
    // Nullable like the column, though nothing here writes a null: a part with no value
    // has no row.
    value_text: z.string().nullable(),
    created_at: DbDate,
    updated_at: DbDate.nullable()
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
    value_text: z.string()
});

declare module 'knex/types/tables' {
    interface Tables {
        members_custom_fields: Knex.CompositeTableType<
            CustomFieldRow,
            // `status` is DB-defaulted to 'active' on create and only ever set via
            // update (archive/restore), so it's absent from the insert type. The rank
            // is required: it is DB-defaulted too, but a create that let it default
            // would silently land the new field at the top of the list.
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
