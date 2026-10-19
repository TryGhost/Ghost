import errors from '@tryghost/errors';
import { CUSTOM_NAMESPACE } from '@tryghost/metafield-types/identity';

/**
 * Who may define fields in a namespace.
 *
 * This is a property of the namespace, not of whoever is asking, so it is settled before
 * any question about the caller. Asking the caller first gets the order wrong in a way
 * that shows: a request to define a field in a namespace nobody owns would be refused for
 * want of a permission, telling the caller to go and get one, when no permission would
 * have helped.
 *
 * The publisher owns `custom` and nothing owns anything else yet. An app owning its own
 * namespace resolves here too, and will not resolve to a permission at all: the caller
 * has to *be* that app rather than hold a role, which is why the staff permission stays
 * named after the publisher's fields rather than after metafields at large.
 */
export function definableByPublisher(namespace: string): boolean {
  return namespace === CUSTOM_NAMESPACE;
}

export function assertDefinable(namespace: string): void {
  if (!definableByPublisher(namespace)) {
    throw new errors.ValidationError({
      message: `Fields cannot be defined in the "${namespace}" namespace.`,
      property: 'namespace',
    });
  }
}
