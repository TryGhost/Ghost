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

// A member's stored value for one field. `value_text`/`value_json` are the raw
// columns — which one carries the value, and how it decodes, is the storage
// codec's business (see storage.ts), so they're plain nullable strings here.
export const DbCustomFieldValue = z.object({
    id: z.string(),
    custom_field_id: z.string(),
    member_id: z.string(),
    value_text: z.string().nullable(),
    value_json: z.string().nullable(),
    created_at: DbDate,
    updated_at: DbDate.nullable()
});

type CustomFieldValueRow = z.infer<typeof DbCustomFieldValue>;

// The value join a read needs: the field's identity and type travel with the
// stored columns, so a row can be decoded without a second lookup. `type` is
// parsed as the field-type enum, which narrows it with no cast.
export const DbCustomFieldValueWithField = z.object({
    member_id: z.string(),
    key: z.string(),
    type: FieldTypeSchema,
    value_text: z.string().nullable(),
    value_json: z.string().nullable()
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
