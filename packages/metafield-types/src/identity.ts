/**
 * How a field is named on every surface that writes its name down as text: CSV column
 * headers, filter values, error paths, URLs.
 *
 * The name is the namespace that declared the field and the field's key, joined by a
 * dot — `custom.company`. A value made of several parts, such as an address, appends
 * the part: `custom.shipping_address.country`. Splitting on dots by position is safe
 * because a key can never contain one; that is enforced where keys are minted.
 *
 * `metafields` is the qualifier, not part of the identity: it names the container, and
 * each context writes it exactly once — the payload key, the route prefix, the CSV
 * column prefix, the filter relation alias — never twice.
 */

export const QUALIFIER = 'metafields';

export const SEPARATOR = '.';

/**
 * The namespace holding the fields a site's own staff define.
 *
 * Namespaces are data, stored with every field, so reading or writing fields never
 * needs this. It is for code that speaks only for the publisher's fields: who may define
 * fields where, and the surfaces that name a publisher's field by key alone. Nothing
 * should treat another namespace as an error because it is not this one: a namespace
 * nobody has declared fields in is an empty namespace.
 */
export const CUSTOM_NAMESPACE = 'custom';

export const IDENTITY_SEGMENT = /^[a-z0-9_]+$/;

/** A formatted identity — `namespace.key`, or `namespace.key.partPath` for one part. */
export type FieldIdentityString = string;

export interface FieldIdentity {
  namespace: string;
  key: string;
  partPath: string | null;
}

export function formatIdentity({ namespace, key, partPath }: FieldIdentity): FieldIdentityString {
  const identity = `${namespace}${SEPARATOR}${key}`;
  return partPath ? `${identity}${SEPARATOR}${partPath}` : identity;
}

export function parseIdentity(identity: string): FieldIdentity | null {
  const [namespace, key, ...parts] = identity.split(SEPARATOR);
  if (
    namespace === undefined ||
    key === undefined ||
    ![namespace, key, ...parts].every((segment) => IDENTITY_SEGMENT.test(segment))
  ) {
    return null;
  }
  return { namespace, key, partPath: parts.length > 0 ? parts.join(SEPARATOR) : null };
}
