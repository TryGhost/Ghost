import {z} from 'zod';
import type {Knex} from 'knex';
import {FieldTypeSchema} from '@tryghost/custom-field-types';
import {DbDate} from '../../lib/db-date';

// A field's lifecycle state. `archived` is a soft state: the field drops out of
// the values path but stays visible in the definition list (with its status) so
// admins can find, rename, restore, or permanently delete it. The values mirror
// schema.js's `isIn` constraint on the column — which is static config and can't
// import this, so that one stays literal with a pointer back here.
export const FIELD_STATUS = {active: 'active', archived: 'archived'} as const;
export type FieldStatus = typeof FIELD_STATUS[keyof typeof FIELD_STATUS];
export const FieldStatusSchema = z.enum([FIELD_STATUS.active, FIELD_STATUS.archived]);

// The members_custom_fields row: the single source for the read projection and the
// knex table type below. `type` is validated as the field-type enum here (the DB
// only stores registered types), so the row already carries the narrow type and
// the definition codec needs no cast. `status` travels with the row: it's part of
// the read projection so the definition list can group active vs archived.
export const DbCustomField = z.object({
    id: z.string(),
    key: z.string(),
    name: z.string(),
    type: FieldTypeSchema,
    status: FieldStatusSchema,
    created_at: DbDate,
    updated_at: DbDate.nullable()
});

type CustomFieldRow = z.infer<typeof DbCustomField>;

// One part of a member's value for one field. `path` says which part: empty for a
// scalar, which has one, and the sub-field's key for a composite, which has a row per
// part it fills. What those paths mean is the storage module's business (see
// storage.ts), so the row itself carries them as plain strings.
export const DbCustomFieldValue = z.object({
    id: z.string(),
    custom_field_id: z.string(),
    member_id: z.string(),
    path: z.string(),
    // Mirrors the column, which is nullable. Nothing here writes a null — a part with
    // no value has no row — but the row type describes the table rather than the
    // subset of it this service produces.
    value_text: z.string().nullable(),
    created_at: DbDate,
    updated_at: DbDate.nullable()
});

type CustomFieldValueRow = z.infer<typeof DbCustomFieldValue>;

// The leaf join a read needs: the field's key travels with the row so a value can be
// assembled without a second lookup.
//
// `type` is parsed as the field-type enum but takes no part in the assembly — which
// shape to rebuild is read from the paths themselves, so a row survives its type
// changing shape. It is here as a gate: a value whose type has left the catalog is one
// the definitions list no longer returns either, and handing it out under a contract
// nothing can interpret helps nobody. Failing to parse is what drops it.
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
            // update (archive/restore), so it's absent from the insert type.
            Omit<z.input<typeof DbCustomField>, 'updated_at' | 'status'>,
            Partial<CustomFieldRow>
        >;
        members_custom_field_values: Knex.CompositeTableType<
            CustomFieldValueRow,
            Omit<z.input<typeof DbCustomFieldValue>, 'updated_at'>,
            Partial<CustomFieldValueRow>
        >;
    }
}
