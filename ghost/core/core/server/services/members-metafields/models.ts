import { z } from 'zod';
import { FieldTypeSchema } from '@tryghost/metafield-types';
import { MemberAccessSchema } from './access';
import { FieldStatusSchema } from './schema';

export const Metafield = z.object({
  id: z.string(),
  namespace: z.string(),
  key: z.string(),
  name: z.string(),
  type: FieldTypeSchema,
  status: FieldStatusSchema,
  access: z.object({ member: MemberAccessSchema }),
  createdAt: z.date(),
  updatedAt: z.date().nullable(),
});
export type Metafield = z.infer<typeof Metafield>;
