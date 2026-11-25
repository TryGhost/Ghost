import { MEMBER_ACCESS, MemberAccessSchema, type MemberAccess } from '@tryghost/metafield-types';

// Re-exported so the rest of the service imports the access vocabulary from one place. What each
// caller can read and write is decided by each namespace's access policy.
export { MEMBER_ACCESS, MemberAccessSchema, type MemberAccess };

/** The API a request came through: the Admin API, the Members API, or Ghost itself. */
export type Caller = 'admin' | 'members' | 'internal';
