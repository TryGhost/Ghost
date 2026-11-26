import { z } from 'zod';
import { READ_SETTINGS, withTypedSettings } from '@tryghost/metafield-types';
import { MEMBER_ACCESS, MemberAccessSchema, type MemberAccess } from '@tryghost/metafield-types';
import { KeySchema, NamespaceSchema } from '@tryghost/metafield-types/identity';
import { FieldStatusSchema } from './schema';

/**
 * A definition's own access policy, laid over its namespace's. It can set a level for `member`, the
 * one subject a definition's row stores a level for, and sets nothing when it leaves it out.
 */
export const DefinitionAccess = z.object({
  member: MemberAccessSchema.exclude([MEMBER_ACCESS.none]).optional(),
});
export type DefinitionAccess = z.infer<typeof DefinitionAccess>;

/**
 * A definition's own policy, from the level its row stores. The column can't be empty, so a
 * stored `none` is a definition that sets nothing of its own.
 */
export function accessOf(stored: MemberAccess): DefinitionAccess {
  return stored === MEMBER_ACCESS.none ? {} : { member: stored };
}

/** The level a definition's row stores for its own policy: `none` when it sets nothing. */
export function storedAccessOf(access: DefinitionAccess): MemberAccess {
  return access.member ?? MEMBER_ACCESS.none;
}

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
