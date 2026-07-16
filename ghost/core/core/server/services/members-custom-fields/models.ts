import {z} from 'zod';
import {FieldTypeSchema} from '@tryghost/custom-field-types';
import {FieldStatusSchema} from './schema';

// The domain shape of a field definition (camelCase; distinct from the DB row).
export const CustomField = z.object({
    id: z.string(),
    key: z.string(),
    name: z.string(),
    type: FieldTypeSchema,
    status: FieldStatusSchema,
    createdAt: z.date(),
    updatedAt: z.date().nullable()
});
export type CustomField = z.infer<typeof CustomField>;
