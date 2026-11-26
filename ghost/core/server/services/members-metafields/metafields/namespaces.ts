import errors from '@tryghost/errors';
import { unreachable } from '../../../lib/unreachable';
import type { Namespace } from '@tryghost/metafield-types/identity';
import type { Asking } from './callers';
import type { DefinitionAccess } from './models';

/**
 * Who an access policy can give a level to. Each is either a kind of caller or how the caller
 * stands to what is being asked for:
 *
 * - `owner`: the app that owns the namespace. Ghost owns the namespaces it registers.
 * - `staff`: any staff user.
 * - `integration`: any integration.
 * - `member`: the member a record belongs to. On members, that is the member themselves. A question
 *   about definitions, which names no record, is answered as it would be for the member's own.
 * - `anonymous`: anyone at all, signed in or not.
 */
export type Subject = 'owner' | 'staff' | 'integration' | 'member' | 'anonymous';

/**
 * What a subject may do with a namespace. Each level includes the ones before it: whoever can
 * write values can read them, and whoever can manage the namespace, by adding, editing, ordering
 * and deleting its definitions, can write them.
 */
export type Level = 'none' | 'read' | 'write' | 'manage';

const LEVELS: readonly Level[] = ['none', 'read', 'write', 'manage'];

/** The level each subject has. A subject left out has none. Plain data, so it can be stored. */
export type AccessPolicy = { readonly [S in Subject]?: Level };

/** Every namespace's policy starts here: its owner manages it, and nobody else has anything. */
export const OWNER_MANAGES: AccessPolicy = { owner: 'manage' };

/**
 * Whether a namespace can be used at all. While it can't, each of its fields reads as archived
 * whatever status it holds, so whatever already happens to an archived field happens to every
 * one of them, and none of them can be changed. Nothing is stored, so each comes back as it was
 * once the namespace is available again.
 */
export interface AvailabilityLimit {
  kind: 'availability';
  /** Asked on every read and change, as what answers it can change while Ghost runs. */
  isAvailable(): boolean;
  /** Throws the limit's own reason for refusing a change, once `isAvailable` has said no. */
  refuse(): Promise<void>;
}

/** How many fields a namespace may hold, asked whenever fields are added to it. */
export interface CountLimit {
  kind: 'count';
  /** Refuses adding `adding` fields to the `held` the namespace already has, with its own reason. */
  assertRoom(held: number, adding: number): Promise<void>;
}

/** Something holding a namespace's fields back. Each kind is applied where it bites, below. */
export type NamespaceLimit = AvailabilityLimit | CountLimit;

/**
 * A namespace as it is registered: the app that owns it, its limits, and its access policy, laid
 * over `OWNER_MANAGES`. Whatever puts fields in a namespace registers it, and this domain applies
 * the rules, so it never has to know whose namespace it is or why its rules are what they are.
 */
export interface NamespaceRegistration {
  namespace: Namespace;
  /** The installation id of the app that owns the namespace, `GHOST_APP_ID` for Ghost's own. */
  owner: string;
  /** Every limit on the namespace. They stack: each one applies. */
  limits: readonly NamespaceLimit[];
  /** Who else may manage the namespace, write its values or read them. */
  access: AccessPolicy;
}

/**
 * What a read or write of values is about: the member its record belongs to, or null on a
 * resource whose records aren't members. A question about definitions has no record at all.
 */
export type RecordOf = { member: string | null } | null;

/** A definition as the policy reads it: its namespace, and its own policy. */
export interface PolicyField {
  namespace: Namespace;
  access: DefinitionAccess;
}

export interface Namespaces {
  /**
   * Registers a namespace while Ghost runs, as installing an app will. Ghost's own are given when
   * it boots. Refuses one already registered.
   */
  register(registration: NamespaceRegistration): void;
  /** Takes a namespace's registration away, after which nothing in it can be reached. */
  unregister(namespace: Namespace): void;
  /** A registered namespace. Nobody registered any other, so nothing in it can be reached. */
  registered(namespace: Namespace): NamespaceRegistration;
  /** The namespaces unavailable right now, whose fields read as archived. */
  unavailable(): Namespace[];
  /** Refuses any change to the namespace's fields its limits don't allow. */
  assertChangeable(namespace: Namespace): Promise<void>;
  /** Refuses adding `adding` fields to the `held` the namespace already has. */
  assertRoom(namespace: Namespace, held: number, adding: number): Promise<void>;
  /** Refuses a caller who may not manage the namespace's definitions. */
  assertManageable(caller: Asking, namespace: Namespace): void;
  /** Whether `caller` may read `field` on `record`, whatever the field's status. */
  canRead(caller: Asking, field: PolicyField, record: RecordOf): boolean;
  /** Whether `caller` may write the values of `field` on `record`. */
  canWrite(caller: Asking, field: PolicyField, record: RecordOf): boolean;
}

/**
 * The namespaces fields can be defined in, each with its registration.
 *
 * A namespace is settled before its policy is asked about the caller. Asking the policy first gets
 * the order wrong in a way that shows: a request to define a field in a namespace nobody
 * registered would be refused as though a level were missing, when no level would have helped.
 */
export function createNamespaces(
  registrations: readonly NamespaceRegistration[],
  {
    definitionLimit,
  }: {
    /** How many fields each namespace may hold, counted for each namespace alone. */
    definitionLimit: CountLimit;
  },
): Namespaces {
  const byNamespace = new Map(
    registrations.map((registration) => [registration.namespace, registration]),
  );
  const everyRegistration = () => [...byNamespace.values()];

  const registered = (namespace: Namespace): NamespaceRegistration => {
    const registration = byNamespace.get(namespace);
    if (!registration) {
      throw new errors.ValidationError({
        message: `Fields cannot be defined in the "${namespace}" namespace.`,
        property: 'namespace',
      });
    }
    return registration;
  };

  // A definition in a namespace nobody registered has no policy, so nobody has any level for it.
  const levelIn = (caller: Asking, field: PolicyField, record: RecordOf): Level => {
    const registration = byNamespace.get(field.namespace);
    return registration ? levelFor(registration, field.access, caller, record) : 'none';
  };

  return {
    register(registration) {
      if (byNamespace.has(registration.namespace)) {
        throw new errors.IncorrectUsageError({
          message: `The "${registration.namespace}" namespace is already registered.`,
        });
      }
      byNamespace.set(registration.namespace, registration);
    },

    unregister(namespace) {
      byNamespace.delete(namespace);
    },

    registered,

    assertManageable(caller, namespace) {
      // Managing is the namespace's to grant, so no definition's own policy is laid over it.
      if (!atLeast(levelFor(registered(namespace), {}, caller, null), 'manage')) {
        throw new errors.NoPermissionError({
          message: `You do not have permission to manage the fields in the "${namespace}" namespace.`,
        });
      }
    },

    canRead(caller, field, record) {
      return atLeast(levelIn(caller, field, record), 'read');
    },

    canWrite(caller, field, record) {
      return atLeast(levelIn(caller, field, record), 'write');
    },

    unavailable() {
      return everyRegistration()
        .filter(({ limits }) => limits.some(makesUnavailable))
        .map(({ namespace }) => namespace);
    },

    async assertChangeable(namespace) {
      for (const limit of registered(namespace).limits) {
        switch (limit.kind) {
          case 'availability':
            if (!limit.isAvailable()) {
              await limit.refuse();
            }
            break;
          case 'count':
            // Asked of adding only: no other change holds more fields.
            break;
          default:
            unreachable(limit, 'limit');
        }
      }
    },

    async assertRoom(namespace, held, adding) {
      // The namespace's own limits first, so a namespace switched off says so rather than that
      // it is full.
      for (const limit of [...registered(namespace).limits, definitionLimit]) {
        switch (limit.kind) {
          case 'availability':
            if (!limit.isAvailable()) {
              await limit.refuse();
            }
            break;
          case 'count':
            await limit.assertRoom(held, adding);
            break;
          default:
            unreachable(limit, 'limit');
        }
      }
    },
  };
}

function atLeast(level: Level, needs: Level): boolean {
  return LEVELS.indexOf(level) >= LEVELS.indexOf(needs);
}

function highest(levels: readonly Level[]): Level {
  return levels.reduce<Level>((best, level) => (atLeast(best, level) ? best : level), 'none');
}

/**
 * The subjects a caller is, in a namespace with this owner, on `record`. Everyone is `anonymous`,
 * since a level for anyone is a level for every caller.
 */
function subjectsOf(caller: Asking, owner: string, record: RecordOf): Subject[] {
  const subjects: Subject[] = ['anonymous'];
  switch (caller.kind) {
    case 'staff':
    case 'integration':
      subjects.push(caller.kind);
      break;
    case 'app':
      if ('installationId' in caller && caller.installationId === owner) {
        subjects.push('owner');
      }
      break;
    case 'member':
      // A kind alone, asking what any member can see, or a question with no record, asks as the
      // record's member would. Otherwise the record has to be this member's.
      if (record === null || ('memberId' in caller && record.member === caller.memberId)) {
        subjects.push('member');
      }
      break;
    case 'anonymous':
      break;
    default:
      unreachable(caller, 'caller');
  }
  return subjects;
}

/** A namespace's policy: its owner manages it, with its registration's access laid over that. */
function policyOf(registration: NamespaceRegistration): AccessPolicy {
  return { ...OWNER_MANAGES, ...registration.access };
}

/**
 * The one rule access is decided by: a definition's policy is its namespace's with its own laid
 * over it, and the caller has the highest level any of its subjects has in it.
 */
function levelFor(
  registration: NamespaceRegistration,
  own: DefinitionAccess,
  caller: Asking,
  record: RecordOf,
): Level {
  const policy: AccessPolicy = { ...policyOf(registration), ...own };
  return highest(
    subjectsOf(caller, registration.owner, record).map((subject) => policy[subject] ?? 'none'),
  );
}

function makesUnavailable(limit: NamespaceLimit): boolean {
  switch (limit.kind) {
    case 'availability':
      return !limit.isAvailable();
    case 'count':
      // A namespace with no room left still reads as it is stored.
      return false;
    default:
      return unreachable(limit, 'limit');
  }
}
