import { z } from 'zod';
import { FieldTypeSchema } from '@tryghost/custom-field-types';
import { FieldStatusSchema } from './schema';

// The domain shape of a field definition (camelCase; distinct from the DB row).
export const CustomField = z.object({
  id: z.string(),
  // Which namespace declared the field. Carried through the domain because it is half
  // of a field's address and decides who may manage it, not just where it is stored.
  namespace: z.string(),
  key: z.string(),
  name: z.string(),
  type: FieldTypeSchema,
  status: FieldStatusSchema,
  createdAt: z.date(),
  updatedAt: z.date().nullable(),
});
export type CustomField = z.infer<typeof CustomField>;
