import {z} from 'zod';
import type {Knex} from 'knex';
import {DbDate} from '../../lib/db-date';

// The member_custom_fields row: the single source for the read projection and the
// knex table types below.
export const DbCustomField = z.object({
    id: z.string(),
    key: z.string(),
    name: z.string(),
    type: z.string(),
    created_at: DbDate,
    updated_at: DbDate.nullable()
});

// The member_custom_field_values row.
export const DbCustomFieldValue = z.object({
    id: z.string(),
    member_custom_field_id: z.string(),
    member_id: z.string(),
    value_text: z.string().nullable(),
    created_at: DbDate,
    updated_at: DbDate.nullable()
});

// knex table types, derived from the schemas above so each row shape has a single source.
declare module 'knex/types/tables' {
    interface Tables {
        member_custom_fields: Knex.CompositeTableType<
            z.infer<typeof DbCustomField>,
            Omit<z.input<typeof DbCustomField>, 'updated_at'>,
            Partial<z.infer<typeof DbCustomField>>
        >;
        member_custom_field_values: Knex.CompositeTableType<
            z.infer<typeof DbCustomFieldValue>,
            Omit<z.input<typeof DbCustomFieldValue>, 'updated_at'>,
            Partial<z.infer<typeof DbCustomFieldValue>>
        >;
    }
}
