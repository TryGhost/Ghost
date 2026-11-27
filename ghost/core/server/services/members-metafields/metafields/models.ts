import { z } from 'zod';
import { READ_SETTINGS, withTypedSettings } from '@tryghost/metafield-types';
import { MemberAccessSchema } from '@tryghost/metafield-types';
import { KeySchema, NamespaceSchema } from '@tryghost/metafield-types/identity';
import { FieldStatusSchema } from './schema';

// Its type and settings are one value, so a field can't carry settings its type doesn't take.
export const Definition = withTypedSettings(
  {
    id: z.string(),
    namespace: NamespaceSchema,
    key: KeySchema,
    name: z.string(),
    status: FieldStatusSchema,
    access: z.object({ member: MemberAccessSchema }),
    createdAt: z.date(),
    updatedAt: z.date().nullable(),
  },
  READ_SETTINGS,
);
export type Definition = z.infer<typeof Definition>;
