import errors from '@tryghost/errors';
import type { Namespace } from '@tryghost/metafield-types/identity';
import type { ObjectType, permissions } from '../permissions/permissions-data';

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
 * The rules a namespace's fields follow. Whatever puts fields in a namespace states them, and
 * this domain applies them, so it never has to know whose namespace it is or why its limits
 * are what they are.
 */
export interface NamespacePolicy {
  namespace: Namespace;
  owner: Owner;
  /** Every limit on the namespace. They stack: each one applies. */
  limits: readonly NamespaceLimit[];
}

export interface Namespaces {
  /** The policy of a namespace someone owns. Nobody owns any other, so no field can be defined there. */
  owned(namespace: Namespace): NamespacePolicy;
  /** The namespaces unavailable right now, whose fields read as archived. */
  unavailable(): Namespace[];
  /** Refuses any change to the namespace's fields its policy doesn't allow. */
  assertChangeable(namespace: Namespace): Promise<void>;
  /** Refuses adding `adding` fields to the `held` the namespace already has. */
  assertRoom(namespace: Namespace, held: number, adding: number): Promise<void>;
}

/**
 * The namespaces fields can be defined in, each with its policy.
 *
 * A namespace is settled before any question about the caller. Asking the caller first gets
 * the order wrong in a way that shows: a request to define a field in a namespace nobody owns
 * would be refused for want of a permission, telling the caller to go and get one, when no
 * permission would have helped.
 */
export function createNamespaces(policies: readonly NamespacePolicy[]): Namespaces {
  const byNamespace = new Map(policies.map((policy) => [policy.namespace, policy]));

  const owned = (namespace: Namespace): NamespacePolicy => {
    const policy = byNamespace.get(namespace);
    if (!policy) {
      throw new errors.ValidationError({
        message: `Fields cannot be defined in the "${namespace}" namespace.`,
        property: 'namespace',
      });
    }
    return policy;
  };

  return {
    owned,

    unavailable() {
      return policies
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
          default: {
            const _exhaustive: never = limit;
            throw new errors.InternalServerError({ message: `Unhandled limit: ${_exhaustive}` });
          }
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
          default: {
            const _exhaustive: never = limit;
            throw new errors.InternalServerError({ message: `Unhandled limit: ${_exhaustive}` });
          }
        }
      }
    },
  };
}

function makesUnavailable(limit: NamespaceLimit): boolean {
  switch (limit.kind) {
    case 'availability':
      return !limit.isAvailable();
    case 'count':
      // A namespace with no room left still reads as it is stored.
      return false;
    default: {
      const _exhaustive: never = limit;
      throw new errors.InternalServerError({ message: `Unhandled limit: ${_exhaustive}` });
    }
  }
}
