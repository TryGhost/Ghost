import { MEMBER_ACCESS, MemberAccessSchema, type MemberAccess } from '@tryghost/metafield-types';

// Re-exported so this module stays the one place the rest of the service asks about
// access, whether the answer is the shared vocabulary or the audience rules below.
export { MEMBER_ACCESS, MemberAccessSchema, type MemberAccess };

/** How far a field is opened to one door. The vocabulary is shared; only members use it today. */
export type AccessLevel = MemberAccess;
export const AccessLevelSchema = MemberAccessSchema;

export type Audience = { entry: 'admin' } | { entry: 'members' } | { entry: 'internal' };

export const ADMIN: Audience = { entry: 'admin' };
export const MEMBERS: Audience = { entry: 'members' };
export const INTERNAL: Audience = { entry: 'internal' };

/**
 * The doors a field is opened to one at a time, each by its own column on the definitions
 * table. `member` is a member reaching their own record through the Members API.
 */
export const SURFACES = {
  member: { column: 'member_access' },
} as const;

export type Surface = keyof typeof SURFACES;
export type AccessColumn = (typeof SURFACES)[Surface]['column'];

/** A field's setting for each door its entity opens fields to one at a time. */
export type Access = Partial<Record<Surface, AccessLevel>>;

type AccessColumns = Partial<Record<AccessColumn, AccessLevel>>;

const SURFACE_NAMES = Object.keys(SURFACES) as Surface[];

/** A definition row's settings, one for each access column the row carries. */
export function accessFromColumns(row: AccessColumns): Access {
  return Object.fromEntries(
    SURFACE_NAMES.flatMap((surface) => {
      const level = row[SURFACES[surface].column];
      return level === undefined ? [] : [[surface, level]];
    }),
  );
}

export function columnsFromAccess(access: Access): AccessColumns {
  return Object.fromEntries(
    SURFACE_NAMES.flatMap((surface) => {
      const level = access[surface];
      return level === undefined ? [] : [[SURFACES[surface].column, level]];
    }),
  );
}

type Door =
  | { narrowedBy: null }
  | { narrowedBy: Surface; readable: AccessLevel[]; writable: AccessLevel[] };

// Every audience is spelled out, staff included: one with no entry here reaches no field,
// so an unrecognised audience matches nothing rather than everything. Staff and Ghost
// itself are narrowed by no surface and reach every field; a door narrowed by a surface
// reaches only what each field's setting for it allows.
const DOORS: Record<Audience['entry'], Door> = {
  admin: { narrowedBy: null },
  internal: { narrowedBy: null },
  members: {
    narrowedBy: 'member',
    readable: [MEMBER_ACCESS.read, MEMBER_ACCESS.write],
    writable: [MEMBER_ACCESS.write],
  },
};

// `Object.hasOwn` rather than a plain lookup: an entry naming a property every object
// inherits (`__proto__`, `constructor`, `toString`) would otherwise return that
// inherited value instead of falling through to no door at all.
function doorFor(audience: Audience): Door | null {
  const entry = audience?.entry;
  return entry !== undefined && Object.hasOwn(DOORS, entry) ? DOORS[entry] : null;
}

/** Which of an entity's fields an audience may read, as a condition on its definitions table. */
export type Readable =
  | { fields: 'every' }
  | { fields: 'none' }
  | { fields: 'where'; column: AccessColumn; levels: AccessLevel[] };

export function readableFields(audience: Audience, surfaces: readonly Surface[]): Readable {
  const door = doorFor(audience);
  if (!door) {
    return { fields: 'none' };
  }
  if (door.narrowedBy === null) {
    return { fields: 'every' };
  }
  // The entity's definitions carry no setting for this door, so no field was ever opened to it.
  if (!surfaces.includes(door.narrowedBy)) {
    return { fields: 'none' };
  }
  return { fields: 'where', column: SURFACES[door.narrowedBy].column, levels: door.readable };
}

export function canWrite(audience: Audience, field: { access: Access }): boolean {
  const door = doorFor(audience);
  if (!door) {
    return false;
  }
  if (door.narrowedBy === null) {
    return true;
  }
  const level = field.access[door.narrowedBy];
  return level !== undefined && door.writable.includes(level);
}
