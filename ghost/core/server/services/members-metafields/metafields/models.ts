import { z } from 'zod';
import { READ_SETTINGS, withTypedSettings } from '@tryghost/metafield-types';
import { MemberAccessSchema } from '@tryghost/metafield-types';
import { KeySchema, NamespaceSchema } from '@tryghost/metafield-types/identity';
import { FieldStatusSchema } from './schema';

/**
 * A definition's own access policy, laid over its namespace's. Every definition says what members
 * may do with it, `none` included: a field kept to staff is kept from members whatever its
 * namespace grants them. It's the one subject a definition's row stores a level for.
 */
export const DefinitionAccess = z.object({ member: MemberAccessSchema });
export type DefinitionAccess = z.infer<typeof DefinitionAccess>;

// Its type and settings are one value, so a field can't carry settings its type doesn't take.
export const Definition = withTypedSettings(
  {
    id: z.string(),
    namespace: NamespaceSchema,
    key: KeySchema,
    name: z.string(),
    status: FieldStatusSchema,
    access: DefinitionAccess,
    createdAt: z.date(),
    updatedAt: z.date().nullable(),
  },
  READ_SETTINGS,
);
export type Definition = z.infer<typeof Definition>;
