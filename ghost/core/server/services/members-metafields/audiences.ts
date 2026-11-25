import { MEMBER_ACCESS, MemberAccessSchema, type MemberAccess } from '@tryghost/metafield-types';

// Re-exported so this module stays the one place the rest of the service reads the access
// vocabulary from. What each audience may reach is the namespace owner's grant, in its access policy.
export { MEMBER_ACCESS, MemberAccessSchema, type MemberAccess };

export type Audience = { entry: 'admin' } | { entry: 'members' } | { entry: 'internal' };

export const ADMIN: Audience = { entry: 'admin' };
export const MEMBERS: Audience = { entry: 'members' };
export const INTERNAL: Audience = { entry: 'internal' };
