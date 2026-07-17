import {z} from 'zod';
import type {Knex} from 'knex';
import {FieldTypeSchema} from '@tryghost/custom-field-types';
import {DbDate} from '../../lib/db-date';

// The members_custom_fields row: the single source for the read projection and the
// knex table type below. `type` is validated as the field-type enum here (the DB
// only stores registered types), so the row already carries the narrow type and
// the definition codec needs no cast.
export const DbCustomField = z.object({
    id: z.string(),
    key: z.string(),
    name: z.string(),
    type: FieldTypeSchema,
    created_at: DbDate,
    updated_at: DbDate.nullable()
});

// A field's lifecycle state. Persistence-only: the domain CustomField doesn't
// carry it (archived-ness is how the store soft-deletes, not something publishers
// see), so it lives here with the row type rather than in models.ts. The values
// mirror schema.js's `isIn` constraint on the column — which is static config and
// can't import this, so that one stays literal with a pointer back here.
export const FIELD_STATUS = {active: 'active', archived: 'archived'} as const;
export type FieldStatus = typeof FIELD_STATUS[keyof typeof FIELD_STATUS];

// The stored row also carries `status`. It's the persistence concern above, so it
// lives only in the knex row type here, not in the codec schema. DB-defaulted to
// 'active' on create and only ever set via update (archive), so it's absent from
// the insert type.
type CustomFieldRow = z.infer<typeof DbCustomField> & {status: FieldStatus};

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
            Omit<z.input<typeof DbCustomField>, 'updated_at'>,
            Partial<CustomFieldRow>
        >;
        members_custom_field_values: Knex.CompositeTableType<
            CustomFieldValueRow,
            Omit<z.input<typeof DbCustomFieldValue>, 'updated_at'>,
            Partial<CustomFieldValueRow>
        >;
    }
}
