import { z } from 'zod';
import { FieldTypeSchema } from '@tryghost/custom-field-types';
import { FieldStatusSchema } from './schema';

// The domain shape of a field definition (camelCase; distinct from the DB row).
//
// `namespace` is plain data: which namespaces exist is decided by whoever declares
// fields, not by a type. The storage layer predates namespace storage and holds the
// publisher's fields alone, so today the codec states the one namespace it implicitly
// is; when storage learns namespaces the codec reads a column instead, and nothing
// above it moves.
export const CustomField = z.object({
  id: z.string(),
  namespace: z.string(),
  key: z.string(),
  name: z.string(),
  type: FieldTypeSchema,
  status: FieldStatusSchema,
  createdAt: z.date(),
  updatedAt: z.date().nullable(),
});
export type CustomField = z.infer<typeof CustomField>;
