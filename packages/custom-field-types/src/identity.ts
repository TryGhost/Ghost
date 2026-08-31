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
 * One namespace exists today. The storage layer does not know that fields have a
 * namespace at all; the codec above it holds every field in `custom`. When apps bring
 * their own namespaces, this registry is where they appear.
 */

export const QUALIFIER = 'metafields';

export const SEPARATOR = '.';

export const CUSTOM_NAMESPACE = 'custom';

/** The namespaces that exist. Fields in an unknown namespace cannot be addressed. */
export const KNOWN_NAMESPACES = [CUSTOM_NAMESPACE] as const;
export type Namespace = (typeof KNOWN_NAMESPACES)[number];

/**
 * Names no app-assigned namespace may ever take: the publisher's, and the platform's
 * own for the standard catalog to come.
 */
export const RESERVED_NAMESPACES = [CUSTOM_NAMESPACE, 'ghost'] as const;

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

export function isKnownNamespace(namespace: string): namespace is Namespace {
  return (KNOWN_NAMESPACES as readonly string[]).includes(namespace);
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
