import errors from '@tryghost/errors';
import { unreachable } from '../../../lib/unreachable';
import type { Namespace } from '@tryghost/metafield-types/identity';
import { MEMBER_ACCESS, type MemberAccess } from '@tryghost/metafield-types';
import type { Asking, CallerKind, ResourceKind } from './resource';

/**
 * Who manages a namespace's fields: defines, renames, reorders, archives, restores and deletes
 * them. Staff do, through one of Ghost's permissions.
 *
 * An app owning its own namespace will be another kind of owner, and not a permission at all:
 * the caller has to *be* that app rather than hold a role.
 */
export interface Owner<R extends ResourceKind> {
  staff: R['StaffPermission'];
}

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

/** What a caller may do with values: nothing, read them, or read and write them. */
export type Level = MemberAccess;

/**
 * What each caller may do with a namespace's values, as data: a caller left out gets nothing.
 * The namespace's owner decides it, as reaching another's fields is a grant of the owner's, not a
 * property of the field or of the caller.
 *
 * It is the base each definition in the namespace lays its own level over: the caller a resource
 * stores a level for on every definition gets that definition's level instead.
 */
export type Access<R extends ResourceKind> = { [Kind in CallerKind<R>]?: Level };

/**
 * Which of a namespace's fields a caller's level reaches: all of them, none of them, or the ones
 * whose stored level is one of `levels`. Worked out from the data above for each read.
 */
export type Grant =
  | { fields: 'all' }
  | { fields: 'none' }
  | { fields: 'by stored level'; levels: readonly Level[] };

/**
 * A namespace as it is registered: its owner, its limits and its access. Whatever puts
 * fields in a namespace registers it, and this domain applies the rules, so it never has to know
 * whose namespace it is or why its limits are what they are.
 */
export interface NamespaceRegistration<R extends ResourceKind> {
  namespace: Namespace;
  owner: Owner<R>;
  /** Every limit on the namespace. They stack: each one applies. */
  limits: readonly NamespaceLimit[];
  access: Access<R>;
}

/** A namespace and what one caller is granted of its fields. */
export interface NamespaceGrant {
  namespace: Namespace;
  grant: Grant;
}

/** What one caller is granted of the fields in each namespace. */
export interface Grants {
  /** Each namespace someone owns, with its owner's grant. */
  owned: NamespaceGrant[];
  /** Every namespace nobody owns. */
  unowned: Grant;
}

export interface Namespaces<R extends ResourceKind> {
  /** The registration of a namespace someone owns. Nobody owns any other, so no field can be defined there. */
  owned(namespace: Namespace): NamespaceRegistration<R>;
  /** The namespaces unavailable right now, whose fields read as archived. */
  unavailable(): Namespace[];
  /** Refuses any change to the namespace's fields its limits don't allow. */
  assertChangeable(namespace: Namespace): Promise<void>;
  /** Refuses adding `adding` fields to the `held` the namespace already has. */
  assertRoom(namespace: Namespace, held: number, adding: number): Promise<void>;
  /** What `caller` may read in each namespace. */
  readable(caller: Asking<R>): Grants;
  /** Whether `caller` may read `field`, by its namespace's grant, whatever the field's status. */
  canRead(caller: Asking<R>, field: { namespace: Namespace; memberAccess: MemberAccess }): boolean;
  /** Whether `caller` may write the values of `field`, by its namespace's grant. */
  canWrite(caller: Asking<R>, field: { namespace: Namespace; memberAccess: MemberAccess }): boolean;
}

/**
 * The namespaces fields can be defined in, each with its registration.
 *
 * A namespace is settled before any question about the caller. Asking the caller first gets
 * the order wrong in a way that shows: a request to define a field in a namespace nobody owns
 * would be refused for want of a permission, telling the caller to go and get one, when no
 * permission would have helped.
 */
export function createNamespaces<R extends ResourceKind>(
  registrations: readonly NamespaceRegistration<R>[],
  {
    unowned,
    definitionLimit,
    storedLevelFor,
  }: {
    /**
     * Who reaches the fields of a namespace nobody owns. Nobody can define a field in one, but a
     * field can still be stored there, as an app's is.
     */
    unowned: Access<R>;
    /** How many fields each namespace may hold, counted for each namespace alone. */
    definitionLimit: CountLimit;
    /** The caller each definition stores its own level for, laid over its namespace's. */
    storedLevelFor: CallerKind<R> | undefined;
  },
): Namespaces<R> {
  const byNamespace = new Map(
    registrations.map((registration) => [registration.namespace, registration]),
  );
  const accessOf = (namespace: Namespace) => byNamespace.get(namespace)?.access ?? unowned;

  // A definition's level for a caller, or else its namespace's, or else none. Every definition
  // stores a level for `storedLevelFor`, so that caller always gets the definition's.
  const grantFor = (access: Access<R>, caller: Asking<R>, needs: readonly Level[]): Grant => {
    if (caller.kind === storedLevelFor) {
      return { fields: 'by stored level', levels: needs };
    }
    return needs.includes(access[caller.kind] ?? MEMBER_ACCESS.none) ? ALL : NONE;
  };

  const owned = (namespace: Namespace): NamespaceRegistration<R> => {
    const registration = byNamespace.get(namespace);
    if (!registration) {
      throw new errors.ValidationError({
        message: `Fields cannot be defined in the "${namespace}" namespace.`,
        property: 'namespace',
      });
    }
    return registration;
  };

  return {
    owned,

    readable(caller) {
      return {
        owned: registrations.map(({ namespace, access }) => ({
          namespace,
          grant: grantFor(access, caller, READS),
        })),
        unowned: grantFor(unowned, caller, READS),
      };
    },

    canRead(caller, field) {
      return reaches(grantFor(accessOf(field.namespace), caller, READS), field);
    },

    canWrite(caller, field) {
      return reaches(grantFor(accessOf(field.namespace), caller, WRITES), field);
    },

    unavailable() {
      return registrations
        .filter(({ limits }) => limits.some(makesUnavailable))
        .map(({ namespace }) => namespace);
    },

    async assertChangeable(namespace) {
      for (const limit of owned(namespace).limits) {
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
      for (const limit of [...owned(namespace).limits, definitionLimit]) {
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

const ALL: Grant = { fields: 'all' };
const NONE: Grant = { fields: 'none' };
/** The levels that let a caller read values, and the one that lets it write them. */
const READS: readonly Level[] = [MEMBER_ACCESS.read, MEMBER_ACCESS.write];
const WRITES: readonly Level[] = [MEMBER_ACCESS.write];

function reaches(grant: Grant, field: { memberAccess: MemberAccess }): boolean {
  switch (grant.fields) {
    case 'all':
      return true;
    case 'none':
      return false;
    case 'by stored level':
      return grant.levels.includes(field.memberAccess);
    default:
      return unreachable(grant, 'grant');
  }
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
