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

// The stored row also carries `status` (archive state). It's a persistence
// concern the domain and wire don't surface, so it lives only in the knex row
// type here, not in the codec schema above. DB-defaulted to 'active' on create
// and only ever set via update (archive), so it's absent from the insert type.
type CustomFieldRow = z.infer<typeof DbCustomField> & {status: 'active' | 'archived'};

declare module 'knex/types/tables' {
    interface Tables {
        members_custom_fields: Knex.CompositeTableType<
            CustomFieldRow,
            Omit<z.input<typeof DbCustomField>, 'updated_at'>,
            Partial<CustomFieldRow>
        >;
    }
}
