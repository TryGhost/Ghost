import {z} from 'zod';

/**
 * The shared catalog of member custom field types.
 *
 * Single source of truth for two tier-neutral facts about a field type: which
 * storage type its value lives in, and how a value is validated. Ghost core
 * imports it to *enforce* validation (and to route storage); admin imports the
 * same schemas for instant form feedback. Neither drifts.
 *
 * This module is deliberately pure data: no presentation (labels, icons, input
 * controls stay in the frontend), no storage codecs (columns and
 * serialize/deserialize stay in the backend), and no lookup helpers (consumers
 * index `FIELD_TYPES` directly).
 *
 * The package admits one thing beyond data, in `./csv`: how a value maps onto
 * CSV columns. That belongs here rather than in either tier because both need
 * the same answer — the backend to write the export and read an import, admin to
 * offer the columns as mapping targets — and a disagreement between them is a
 * file that silently stops round-tripping.
 *
 * Behaviour is proven where it matters, in the members custom-fields and member
 * export HTTP API integration tests, rather than in isolated unit tests here.
 */

/**
 * Storage types: the small, closed set of database columns a value can live in.
 * The backend owns the column and its serialize/deserialize per storage type;
 * everything here only needs to know which one a field type routes to.
 */
export type StorageType = 'text' | 'json';

/**
 * Field types: the open, growing set a publisher picks. Many field types share
 * one storage type (short_text and long_text both store as text), yet each
 * carries its own validation even when the storage is identical — which is why
 * validation hangs off the field type, not the storage type. Declared once here
 * as the source for the union type, the zod enum, and the FIELD_TYPES keys.
 */
export const FIELD_TYPE_IDS = ['short_text', 'long_text', 'address'] as const;
export type FieldType = typeof FIELD_TYPE_IDS[number];
export const FieldTypeSchema = z.enum(FIELD_TYPE_IDS);

export interface FieldTypeDefinition {
    /** The storage column a value of this type is persisted in (backend concern). */
    storageType: StorageType;
    /**
     * The authoritative validation for a value of this type. The backend runs it
     * as the gate; the frontend runs the same schema for instant feedback.
     */
    value: z.ZodType;
}

/**
 * Long text is bounded in bytes, not characters, because the storage column it
 * routes to is bounded in bytes (MySQL TEXT holds 65,535 of them). A character
 * bound would accept a multibyte value that the column then can't hold: 65,535
 * emoji is four times over. Shopify documents its metafield limits in bytes for
 * the same reason.
 *
 * TextEncoder rather than Buffer: this package runs in the browser too.
 */
export const MAX_LONG_TEXT_BYTES = 65535;

const byteLength = (value: string): number => new TextEncoder().encode(value).length;

/**
 * The address value — a composite type, modelled on Stripe's Address object.
 * Because it is one zod object, invalid sub-fields surface per path (the caller
 * can point at `postal_code` specifically) with no bespoke composite handling.
 *
 * Every sub-field is optional, because none of them exists everywhere: there is
 * no postal code in Ireland or Hong Kong, and no city in an Irish townland
 * address. Which sub-fields a particular address needs is a per-country question,
 * and only the collection form knows the country — so requiring any of them here
 * would leave a correctly-shaped form unable to produce a valid value.
 *
 * What holds instead is that an address must say something. An object with
 * nothing filled in is not an empty address, it is no address, and a value is
 * cleared by omitting it rather than by emptying it.
 *
 * Every sub-field is bounded. An address is a delivery address, so the bounds are
 * set by what a courier will accept, not by what the column could hold — and a
 * composite with unbounded members is a composite with no bound at all.
 */
export const AddressValue = z.object({
    line1: z.string().trim().max(255).optional(),
    line2: z.string().trim().max(255).optional(),
    city: z.string().trim().max(255).optional(),
    state: z.string().trim().max(255).optional(),
    postal_code: z.string().trim().max(32).optional(),
    /**
     * The shape of an ISO 3166-1 alpha-2 code, deliberately not checked against the
     * actual list of them. A closed list would put Ghost in the position of deciding
     * whose country is real, which is not a judgement a publishing platform should be
     * making of its members, and there is no defensible answer for Kosovo, Taiwan,
     * Palestine or Western Sahara. Anything well-formed is stored, and the collection
     * form offers a list to pick from without being the arbiter of it.
     *
     * Case is normalised, because that is a question about the same country rather than
     * about which countries exist. Left alone, `gb` and `GB` are two values for one
     * place: a filter for one silently misses the other, and nothing can tell them apart
     * afterwards to repair it. Normalising on the way in is the only point at which that
     * is cheap.
     *
     * Shape is two ASCII letters rather than any two characters, which is what alpha-2
     * means. Counting characters instead would be wrong in both directions once case is
     * normalised, because uppercasing does not preserve length: `ß` becomes `SS` and
     * would pass a length-of-two rule from one character, while `aß` becomes `ASS` and
     * would fail it from two. Checking the shape of the input settles both, and turns
     * away the `12` and `!!` that a bare length check always allowed through.
     */
    country: z.string().trim().regex(/^[A-Za-z]{2}$/).toUpperCase().optional()
}).refine(
    // Every sub-field is trimmed above, so whitespace has already become the empty
    // string by the time this runs. Trimming is what stops `{line1: '   '}` being
    // stored: admin trims a sub-field away before rendering it, so an address of
    // spaces would be one no screen could show, and none could clear either.
    //
    // The type check is load-bearing, not defensive. A sub-field that is optional
    // and explicitly undefined survives parsing as a key holding undefined, and
    // `undefined !== ''` on its own would let `{line1: undefined}` satisfy a rule
    // whose whole purpose is to reject an address with nothing in it.
    address => Object.values(address).some(value => typeof value === 'string' && value !== ''),
    {message: 'An address must have at least one part filled in.'}
);
export type Address = z.infer<typeof AddressValue>;

export const FIELD_TYPES = {
    // Characters, not bytes: 255 of anything fits the column with room to spare,
    // and a character count is the limit a publisher can reason about.
    short_text: {storageType: 'text', value: z.string().max(255)},
    long_text: {
        storageType: 'text',
        value: z.string().refine(value => byteLength(value) <= MAX_LONG_TEXT_BYTES, {
            message: `Value must be at most ${MAX_LONG_TEXT_BYTES} bytes.`
        })
    },
    address: {storageType: 'json', value: AddressValue}
} as const satisfies Record<FieldType, FieldTypeDefinition>;

/**
 * The sub-fields of a composite type in declaration order, or null for a scalar.
 *
 * Derived from the value schema rather than declared alongside it, so the two cannot
 * drift: adding a sub-field is one edit and every consumer sees it. It is also the
 * only honest test of what "composite" means here — a value is composite when it has
 * parts, which is a fact about its shape and not about the column it happens to be
 * stored in. Two field types can share a storage type and disagree about this, so
 * anything asking "does this value have parts?" has to ask the shape.
 */
export function subFieldsOf(type: FieldType): string[] | null {
    const {value} = FIELD_TYPES[type];
    return value instanceof z.ZodObject ? Object.keys(value.shape) : null;
}
