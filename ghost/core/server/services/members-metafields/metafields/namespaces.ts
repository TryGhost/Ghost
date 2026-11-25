import errors from '@tryghost/errors';
import { unreachable } from '../../../lib/unreachable';
import type { Namespace } from '@tryghost/metafield-types/identity';
import type { ObjectType, permissions } from '../../../auth/permissions/permissions-data';
import type { MemberAccess } from '@tryghost/metafield-types';

/** The staff permissions that cover managing fields: each grants adding, editing and deleting. */
type ManagingPermission = {
  [Type in ObjectType]: 'add' | 'edit' | 'destroy' extends (typeof permissions)[Type][number]
    ? Type
    : never;
}[ObjectType];

/**
 * Who manages a namespace's fields: defines, renames, reorders, archives, restores and deletes
 * them. Staff do, through one of Ghost's permissions.
 *
 * An app owning its own namespace will be another kind of owner, and not a permission at all:
 * the caller has to *be* that app rather than hold a role.
 */
export interface Owner {
  staff: ManagingPermission;
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

/**
 * Which of a namespace's fields a grant reaches: all of them, none of them, or the ones whose
 * stored member access is one of `levels`.
 *
 * The last is a per-field setting the members' fields table stores, so it is the one way a grant
 * can tell one field of a namespace from another. It belongs to the members resource and moves
 * there with the column, once a second resource holds fields.
 */
export type Grant =
  | { fields: 'all' }
  | { fields: 'none' }
  | { fields: 'by member access'; levels: readonly MemberAccess[] };

/**
 * Who may read and write a namespace's fields. The namespace's owner decides it, as reaching
 * another's fields is a grant of the owner's, not a property of the field or of the caller.
 */
export interface AccessPolicy<Caller> {
  /** The fields `caller` may read. A field it can't read is one it can't tell exists. */
  read(caller: Caller): Grant;
  /** The fields `caller` may write the values of, of the ones it can read. */
  write(caller: Caller): Grant;
}

/**
 * A namespace as it is registered: its owner, its limits and its access policy. Whatever puts
 * fields in a namespace registers it, and this domain applies the rules, so it never has to know
 * whose namespace it is or why its limits are what they are.
 */
export interface NamespaceRegistration<Caller> {
  namespace: Namespace;
  owner: Owner;
  /** Every limit on the namespace. They stack: each one applies. */
  limits: readonly NamespaceLimit[];
  accessPolicy: AccessPolicy<Caller>;
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

export interface Namespaces<Caller> {
  /** The registration of a namespace someone owns. Nobody owns any other, so no field can be defined there. */
  owned(namespace: Namespace): NamespaceRegistration<Caller>;
  /** The namespaces unavailable right now, whose fields read as archived. */
  unavailable(): Namespace[];
  /** Refuses any change to the namespace's fields its limits don't allow. */
  assertChangeable(namespace: Namespace): Promise<void>;
  /** Refuses adding `adding` fields to the `held` the namespace already has. */
  assertRoom(namespace: Namespace, held: number, adding: number): Promise<void>;
  /** What `caller` may read in each namespace. */
  readable(caller: Caller): Grants;
  /** Whether `caller` may read `field`, by its namespace's grant, whatever the field's status. */
  canRead(caller: Caller, field: { namespace: Namespace; memberAccess: MemberAccess }): boolean;
  /** Whether `caller` may write the values of `field`, by its namespace's grant. */
  canWrite(caller: Caller, field: { namespace: Namespace; memberAccess: MemberAccess }): boolean;
}

/**
 * The namespaces fields can be defined in, each with its registration.
 *
 * A namespace is settled before any question about the caller. Asking the caller first gets
 * the order wrong in a way that shows: a request to define a field in a namespace nobody owns
 * would be refused for want of a permission, telling the caller to go and get one, when no
 * permission would have helped.
 */
export function createNamespaces<Caller>(
  registrations: readonly NamespaceRegistration<Caller>[],
  {
    unowned,
  }: {
    /**
     * Who reaches the fields of a namespace nobody owns. Nobody can define a field in one, but a
     * field can still be stored there, as an app's is.
     */
    unowned: AccessPolicy<Caller>;
  },
): Namespaces<Caller> {
  const byNamespace = new Map(
    registrations.map((registration) => [registration.namespace, registration]),
  );
  const accessPolicyOf = (namespace: Namespace) =>
    byNamespace.get(namespace)?.accessPolicy ?? unowned;

  const owned = (namespace: Namespace): NamespaceRegistration<Caller> => {
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
        owned: registrations.map(({ namespace, accessPolicy }) => ({
          namespace,
          grant: accessPolicy.read(caller),
        })),
        unowned: unowned.read(caller),
      };
    },

    canRead(caller, field) {
      return reaches(accessPolicyOf(field.namespace).read(caller), field);
    },

    canWrite(caller, field) {
      return reaches(accessPolicyOf(field.namespace).write(caller), field);
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
      for (const limit of owned(namespace).limits) {
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

function reaches(grant: Grant, field: { memberAccess: MemberAccess }): boolean {
  switch (grant.fields) {
    case 'all':
      return true;
    case 'none':
      return false;
    case 'by member access':
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
