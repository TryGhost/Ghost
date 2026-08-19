import {z} from 'zod';
import {snakeKeys} from '../../lib/case-keys';
import {CustomField} from './models';

// Response schema — the field-definition shape the admin endpoints emit. `id` is
// the DB primary key and deliberately never leaves the API; a field is addressed
// by its immutable `key`. The `.pipe` below strips id from the mapped output.
const CustomFieldResource = z.object({
    key: z.string(),
    name: z.string(),
    type: z.string(),
    status: z.string(),
    created_at: z.date(),
    updated_at: z.date().nullable(),
    // Relations, present only when the request asked for them. Absent rather than empty,
    // so a caller can tell "not requested" from "nothing depends on this".
    bindings: z.array(z.object({port: z.string()})).optional(),
    tiers: z.array(z.object({id: z.string(), name: z.string()})).optional()
});
const CustomFieldsResponse = z.object({members_custom_fields: z.array(CustomFieldResource)});

/** A definition as the endpoints hand it over: the domain shape, plus anything joined on. */
export const CustomFieldWithRelations = CustomField.extend({
    // What writes into this field: one entry per writer, so "three things feed this" is a
    // count rather than an inference.
    bindings: z.array(z.object({port: z.string()})).optional(),
    tiers: z.array(z.object({id: z.string(), name: z.string()})).optional()
});
export type CustomFieldWithRelations = z.infer<typeof CustomFieldWithRelations>;

export const toCustomFieldsResponse = z.array(CustomFieldWithRelations)
    .transform((fields): z.input<typeof CustomFieldsResponse> => ({
        // Shallow, so a relation's own keys are left as they were written — they are
        // already the names the response uses.
        members_custom_fields: fields.map(field => snakeKeys(field))
    }))
    .pipe(CustomFieldsResponse);
