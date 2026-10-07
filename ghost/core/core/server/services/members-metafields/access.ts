import {
  MEMBER_ACCESS,
  MEMBER_ACCESS_LEVELS,
  MemberAccessSchema,
  type MemberAccess,
} from '@tryghost/metafield-types';

// Re-exported so this module stays the one place the rest of the service asks about
// access, whether the answer is the shared vocabulary or the audience rules below.
export { MEMBER_ACCESS, MemberAccessSchema, type MemberAccess };

const EVERY_LEVEL: MemberAccess[] = [...MEMBER_ACCESS_LEVELS];

export type Audience = { entry: 'admin' } | { entry: 'members' } | { entry: 'internal' };

export const ADMIN: Audience = { entry: 'admin' };
export const MEMBERS: Audience = { entry: 'members' };
export const INTERNAL: Audience = { entry: 'internal' };

// Every audience is spelled out with the levels it may read, staff included, because
// reads narrow on whatever this returns and an audience with no entry gets an empty
// list, which matches no field. Giving staff a way to skip the check instead would
// invert that: an unrecognised audience would then match everything.
const READABLE: Record<Audience['entry'], MemberAccess[]> = {
  admin: EVERY_LEVEL,
  internal: EVERY_LEVEL,
  members: [MEMBER_ACCESS.read, MEMBER_ACCESS.write],
};

const WRITABLE: Record<Audience['entry'], MemberAccess[]> = {
  admin: EVERY_LEVEL,
  internal: EVERY_LEVEL,
  members: [MEMBER_ACCESS.write],
};

// `Object.hasOwn` rather than a plain lookup: an entry naming a property every object
// inherits (`__proto__`, `constructor`, `toString`) would otherwise return that
// inherited value instead of falling through to the empty list.
function levelsFor(
  table: Record<Audience['entry'], MemberAccess[]>,
  audience: Audience,
): MemberAccess[] {
  const entry = audience?.entry;
  return entry !== undefined && Object.hasOwn(table, entry) ? table[entry] : [];
}

export function readableLevels(audience: Audience): MemberAccess[] {
  return levelsFor(READABLE, audience);
}

export function canWrite(audience: Audience, field: { memberAccess: MemberAccess }): boolean {
  return levelsFor(WRITABLE, audience).includes(field.memberAccess);
}
