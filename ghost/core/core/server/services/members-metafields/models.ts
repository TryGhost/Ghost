import { z } from 'zod';
import { FieldTypeSchema } from '@tryghost/metafield-types';
import { MemberAccessSchema } from './access';
import { MetafieldKey, Namespace } from './identifiers';
import { FieldStatusSchema } from './schema';

export const Metafield = z.object({
  id: z.string(),
  namespace: Namespace,
  key: MetafieldKey,
  name: z.string(),
  type: FieldTypeSchema,
  status: FieldStatusSchema,
  access: z.object({ member: MemberAccessSchema }),
  createdAt: z.date(),
  updatedAt: z.date().nullable(),
});
export type Metafield = z.infer<typeof Metafield>;

/** A field as everything outside the definitions table points at it. */
export type MetafieldRef = Pick<Metafield, 'namespace' | 'key'>;
