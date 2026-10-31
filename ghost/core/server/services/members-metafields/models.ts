import { z } from 'zod';
import { TypedSettingsSchema } from '@tryghost/metafield-types';
import { MemberAccessSchema } from './access';
import { KeySchema, NamespaceSchema } from '@tryghost/metafield-types/identity';
import { FieldStatusSchema } from './schema';

// Its type and settings are one value, so a field can't carry settings its type doesn't take.
export const Metafield = z
  .object({
    id: z.string(),
    namespace: NamespaceSchema,
    key: KeySchema,
    name: z.string(),
    status: FieldStatusSchema,
    access: z.object({ member: MemberAccessSchema }),
    createdAt: z.date(),
    updatedAt: z.date().nullable(),
  })
  .and(TypedSettingsSchema);
export type Metafield = z.infer<typeof Metafield>;
