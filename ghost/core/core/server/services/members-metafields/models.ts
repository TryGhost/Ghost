import { z } from 'zod';
import { FieldTypeSchema } from '@tryghost/metafield-types';
import { IDENTITY_SEGMENT } from '@tryghost/metafield-types/identity';
import { MemberAccessSchema } from './access';
import { FieldStatusSchema } from './schema';

const IdentitySegment = z.string().regex(IDENTITY_SEGMENT);

export const Metafield = z.object({
  id: z.string(),
  namespace: IdentitySegment,
  key: IdentitySegment,
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
