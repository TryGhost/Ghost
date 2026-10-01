import { z } from 'zod';
import { FieldTypeSchema } from '@tryghost/metafield-types';
import { AccessLevelSchema, type Surface } from './access';
import { FieldStatusSchema } from './schema';

// Optional because a field has a setting only for the doors its entity opens fields to:
// a member's field says what the member may do with it, a post's says nothing. Keyed by
// every surface there is, so a door added to `SURFACES` does not compile until it is here.
const ACCESS: { [S in Surface]: z.ZodOptional<typeof AccessLevelSchema> } = {
  member: AccessLevelSchema.optional(),
};

export const Metafield = z.object({
  id: z.string(),
  namespace: z.string(),
  key: z.string(),
  name: z.string(),
  type: FieldTypeSchema,
  status: FieldStatusSchema,
  access: z.object(ACCESS),
  createdAt: z.date(),
  updatedAt: z.date().nullable(),
});
export type Metafield = z.infer<typeof Metafield>;
