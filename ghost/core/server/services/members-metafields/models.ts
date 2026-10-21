import { z } from 'zod';
import { FieldTypeSchema } from '@tryghost/metafield-types';
import { MemberAccessSchema } from './access';
import { KeySchema, NamespaceSchema } from '@tryghost/metafield-types/identity';
import { FieldStatusSchema } from './schema';

export const Metafield = z.object({
  id: z.string(),
  namespace: NamespaceSchema,
  key: KeySchema,
  name: z.string(),
  type: FieldTypeSchema,
  status: FieldStatusSchema,
  access: z.object({ member: MemberAccessSchema }),
  createdAt: z.date(),
  updatedAt: z.date().nullable(),
});
export type Metafield = z.infer<typeof Metafield>;
