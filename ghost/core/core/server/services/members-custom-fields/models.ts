import { z } from 'zod';
import { FieldTypeSchema } from '@tryghost/custom-field-types';
import { CUSTOM_NAMESPACE } from '@tryghost/custom-field-types/identity';
import { FieldStatusSchema } from './schema';

// The domain shape of a field definition (camelCase; distinct from the DB row).
//
// `namespace` is a literal because the storage layer does not know fields have one: every
// field the schema can hold is the publisher's, so the codec states it rather than reads
// it. When app namespaces arrive the literal widens and the codec starts reading a column,
// and nothing above the codec moves.
export const CustomField = z.object({
  id: z.string(),
  namespace: z.literal(CUSTOM_NAMESPACE),
  key: z.string(),
  name: z.string(),
  type: FieldTypeSchema,
  status: FieldStatusSchema,
  createdAt: z.date(),
  updatedAt: z.date().nullable(),
});
export type CustomField = z.infer<typeof CustomField>;
