import {z} from 'zod';
import {snakeKeys} from '../../lib/case-keys';
import {CustomField} from './models';

// Response schema — the field-definition shape the admin endpoints emit.
const CustomFieldResource = z.object({
    id: z.string(),
    key: z.string(),
    name: z.string(),
    type: z.string(),
    created_at: z.date(),
    updated_at: z.date().nullable()
});
const CustomFieldsResponse = z.object({member_custom_fields: z.array(CustomFieldResource)});

export const toCustomFieldsResponse = z.array(CustomField)
    .transform((fields): z.input<typeof CustomFieldsResponse> => ({
        member_custom_fields: fields.map(field => snakeKeys(field))
    }))
    .pipe(CustomFieldsResponse);
