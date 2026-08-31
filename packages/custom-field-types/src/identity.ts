/**
 * How a field is named, everywhere a field is named.
 *
 * A field's identity is its namespace and key, dotted; a leaf inside a composite value
 * appends its part path: `custom.company`, `custom.shipping_address.country`. The parse
 * is positional — first segment namespace, second key, rest part path — and total,
 * because a key never contains a dot. Every serialized surface (CSV columns, filter
 * values, error paths, routes) speaks this form, so it lives here where both tiers can
 * reach it, for the same reason `./csv` does.
 *
 * `metafields` is the qualifier, not part of the identity: it names the container when
 * standing at the member level, and each context writes it exactly once — the payload
 * key, the route prefix, the CSV column prefix, the filter relation alias — never twice.
 *
 * Namespaces are data, not a registry: a field's namespace arrives with the field, and
 * everything above the storage layer carries it through without knowing which
 * namespaces exist. One is stored today (see `CUSTOM_NAMESPACE`).
 */

export const QUALIFIER = 'metafields';

export const SEPARATOR = '.';

/**
 * The publisher's namespace. Not a registry entry — namespaces are data, arriving
 * with whoever declares fields — but the storage layer predates namespace storage
 * and holds the publisher's fields alone, so the query boundary needs the one
 * namespace it implicitly is. Nothing above that boundary may branch on this: an
 * unknown namespace is a namespace with no fields yet, the same non-event as an
 * unknown key, so that a namespace arriving as data starts working with no code
 * change above the storage layer.
 */
export const CUSTOM_NAMESPACE = 'custom';

/**
 * The shape of one identity segment. The same allowlist the key minter enforces, held
 * here as the parse rule: a segment is what can appear between dots, so anything a key
 * could never be is not worth splitting on.
 */
const SEGMENT = /^[a-z0-9_]+$/;

export interface FieldIdentity {
  namespace: string;
  key: string;
  /** The dotted part path into a composite value, or null for the field itself. */
  path: string | null;
}

export function formatIdentity({ namespace, key, path }: FieldIdentity): string {
  const identity = `${namespace}${SEPARATOR}${key}`;
  return path ? `${identity}${SEPARATOR}${path}` : identity;
}

/**
 * Read an identity back from its dotted form, or null for anything that is not one.
 *
 * Null rather than a throw, because every caller sits on an input boundary — a filter
 * value, a CSV header, a route segment — and each has its own way of refusing bad
 * input. Whether the namespace is one that exists is a separate question
 * (`isKnownNamespace`): a well-formed identity in an unknown namespace parses, so the
 * caller can say which of the two was wrong.
 */
export function parseIdentity(identity: string): FieldIdentity | null {
  const [namespace, key, ...parts] = identity.split(SEPARATOR);
  if (
    namespace === undefined ||
    key === undefined ||
    ![namespace, key, ...parts].every((segment) => SEGMENT.test(segment))
  ) {
    return null;
  }
  return { namespace, key, path: parts.length > 0 ? parts.join(SEPARATOR) : null };
}
