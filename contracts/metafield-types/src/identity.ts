import * as z from 'zod/mini';

/**
 * How a metafield is named, in the words every surface uses for it, and the checks that
 * produce each word.
 *
 * - A **namespace** is who declared the field: `custom` for the fields a site's own staff
 *   define, and an app's own name for the fields it declares.
 * - A **key** names the field within its namespace.
 * - A **part** names one attribute of a record type's value, such as an address's
 *   `country`. A record inside a record takes a part for each level.
 * - An **identity** is the namespace, the key and any parts, in that order, joined by dots:
 *   `custom.company` names a field, and `custom.shipping_address.country` one part of its
 *   value.
 *
 * Every one of them is a segment, and every segment follows the same rule: lowercase
 * letters, digits and underscores. Filters, CSV columns, email replacement strings and
 * themes all accept those and disagree about everything else. No segment can contain the
 * dot, so an identity splits back into its segments by position.
 *
 * `metafields` is the qualifier, not part of an identity: it names the container, and each
 * context writes it once, as the payload key, the route prefix, the CSV column prefix or the
 * filter relation.
 */

export const QUALIFIER = 'metafields';

export const SEPARATOR = '.';

function segment(noun: string) {
  return z.string().check(
    z.regex(/^[a-z0-9_]+$/, {
      error: `A ${noun} can only contain lowercase letters, numbers and underscores.`,
    }),
  );
}

export const NamespaceSchema = segment('namespace').brand<'Namespace'>();
export type Namespace = z.infer<typeof NamespaceSchema>;

export const KeySchema = segment('key').brand<'Key'>();
export type Key = z.infer<typeof KeySchema>;

export const PartSchema = segment('part').brand<'Part'>();
export type Part = z.infer<typeof PartSchema>;

/**
 * An identity's segments, each checked. A field's own identity has no parts, so reading one
 * whose segments arrive apart, such as a route's namespace and key, can leave `parts` out.
 * What it reads always has them.
 */
export const IdentitySchema = z.object({
  namespace: NamespaceSchema,
  key: KeySchema,
  parts: z._default(z.array(PartSchema), () => []),
});
export type Identity = z.output<typeof IdentitySchema>;

/** An identity read from its text, checking every segment, and written back to it. */
export const IdentityTextSchema = z.codec(z.string(), IdentitySchema, {
  decode: (text) => {
    const [namespace = '', key = '', ...parts] = text.split(SEPARATOR);
    return { namespace, key, parts };
  },
  // Zod types the argument as what the schema reads, where `parts` can be left out, but `z.encode`
  // refuses an identity without them before this runs.
  encode: ({ namespace, key, parts = [] }) => [namespace, key, ...parts].join(SEPARATOR),
});

/**
 * The namespace holding the fields a site's own staff define.
 *
 * Every field records its namespace, so reading and writing fields never needs this. It
 * is for code that speaks only for the publisher's fields: who may define fields where,
 * and the surfaces that name a publisher's field by key alone. Another namespace is not
 * an error for not being this one: a namespace nobody has declared fields in is empty.
 */
export const CUSTOM_NAMESPACE = NamespaceSchema.parse('custom');
