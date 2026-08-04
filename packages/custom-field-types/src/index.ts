import {z} from 'zod';

/**
 * The shared catalog of member custom field types.
 *
 * Single source of truth for two tier-neutral facts about a field type: what a valid
 * value is, and whether a value has parts. Ghost core imports it to *enforce* validation;
 * admin imports the same schemas for instant form feedback. Neither drifts.
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
 * Field types: the open, growing set a publisher picks. Declared once here as the source
 * for the union type, the zod enum, and the FIELD_TYPES keys.
 */
export const FIELD_TYPE_IDS = ['short_text', 'long_text', 'address'] as const;
export type FieldType = typeof FIELD_TYPE_IDS[number];
export const FieldTypeSchema = z.enum(FIELD_TYPE_IDS);

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
 * The value builders a field type is assembled from.
 *
 * A leaf type is one of these; a composite type is a record of them. The same builder
 * serves both, so "this part is a short text" and "this field is a short text" are one
 * statement rather than two that can drift.
 *
 * Each builder names what a value is rather than taking a size, so a part is declared as
 * the thing it is and its bound lives with everything else true of that thing. A number
 * passed in at the call site would have to be read back the other way — 32 explains
 * nothing about why a postal code is shorter than a street.
 */
/**
 * Text as it arrives: trimmed, once, for every type and every part built on it.
 *
 * Said here rather than in each builder so the types cannot disagree about whitespace —
 * a value of nothing but spaces is nothing, whichever field it was typed into. Trimming
 * before any other rule also makes the bounds measure the value rather than the padding.
 */
const text = () => z.string().trim();

const shortText = () => text().max(255);

const longText = () => text().refine(value => byteLength(value) <= MAX_LONG_TEXT_BYTES, {
    message: `Value must be at most ${MAX_LONG_TEXT_BYTES} bytes.`
});

/**
 * A postal code, bounded well under a street address because no country's is long. The
 * bound is a sanity limit rather than a format: postal codes vary too much between
 * countries to check the shape of one without knowing which country it is for, and the
 * country is a sibling part rather than something this can see.
 */
const postalCode = () => text().max(32);

/**
 * The shape of an ISO 3166-1 alpha-2 code, deliberately not checked against the actual
 * list of them. A closed list would put Ghost in the position of deciding whose country
 * is real, which is not a judgement a publishing platform should be making of its
 * members, and there is no defensible answer for Kosovo, Taiwan, Palestine or Western
 * Sahara. Anything well-formed is stored, and the collection form offers a list to pick
 * from without being the arbiter of it.
 *
 * Case is normalised, because that is a question about the same country rather than
 * about which countries exist. Left alone, `gb` and `GB` are two values for one place: a
 * filter for one silently misses the other, and nothing can tell them apart afterwards to
 * repair it.
 *
 * Two ASCII letters rather than any two characters, which is what alpha-2 means. Counting
 * the characters of the result would be wrong in both directions, because uppercasing
 * does not preserve length: `ß` becomes `SS` and would pass a length-of-two rule from one
 * character, while `aß` becomes `ASS` and would fail it from two.
 */
const countryCode = () => text().regex(/^[A-Za-z]{2}$/).toUpperCase();

/**
 * A value of a field type, or of one part of one: text, whatever rules narrow it.
 *
 * Both ends are pinned to a string. Storage keeps one string per leaf, so a type parsing
 * to anything else is one whose values can be written and never read back — a fact worth
 * learning from the compiler rather than from a 500 on the first save.
 */
type PartSchema = z.ZodType<string, string>;

/**
 * A part as a write may name it: absent, meaning it is not being spoken about; empty,
 * meaning clear it; or a value of its own kind.
 *
 * Emptying is a statement about the write rather than about the part, so it is stated
 * once here rather than inside each builder. A rule that is a bound admits the empty
 * string on its own and would never have needed this; one that is a format does not, and
 * would otherwise leave its part the only one that could be set but never removed.
 *
 * Trimming before the choice rather than after is what keeps a part of nothing but
 * whitespace the same as an empty one for every rule alike.
 */
const clearable = <T extends PartSchema>(part: T) => text().pipe(z.union([z.literal(''), part])).optional();

/**
 * A field type: either a leaf, which is a value in its own right, or a record of named
 * fields, which is a value made of them.
 *
 * A record's `value` is derived from its parts rather than written beside them, so the
 * parts are declared once and everything downstream — validation, the CSV columns, the
 * paths a filter may address, what admin renders — reads the same declaration.
 */
export interface FieldTypeDefinition {
    value: z.ZodType;
    /**
     * Present on a record type only: the fields it is made of, in declaration order.
     *
     * These are the parts as declared — each one's own rule, and nothing about how a
     * write may name it. Validate a value against the type's `value`, not against these:
     * a write also accepts an empty part, which clears it, and no part's own rule says so.
     */
    fields?: Record<string, PartSchema>;
}

/**
 * A field type as it is declared: a schema, for a type that is a value in its own right,
 * or a record built by `record`, for one made of parts.
 */
type FieldTypeDeclaration = PartSchema | FieldTypeDefinition;

/** A declaration as the catalog exposes it. A bare schema is a value with no parts. */
type Defined<D> = D extends z.ZodType ? {value: D} : D;

/**
 * The catalog, from what each type was declared as.
 *
 * A type that is simply a value says so by being one, with no wrapper to write for the
 * common case; a type made of parts says so by being a `record`, which is where the
 * work happens and so is worth naming at the call site.
 */
function defineFieldTypes<D extends Record<FieldType, FieldTypeDeclaration>>(declarations: D): {[K in keyof D]: Defined<D[K]>} {
    // The mapping is restated for the type system, which cannot follow a conditional
    // type through `Object.fromEntries`.
    return Object.fromEntries(
        Object.entries(declarations).map(([type, declared]) => [type, declared instanceof z.ZodType ? {value: declared} : declared])
    ) as {[K in keyof D]: Defined<D[K]>};
}

/**
 * Every part of a record is optional, because none of an address's exists everywhere:
 * there is no postal code in Ireland or Hong Kong, and no city in an Irish townland
 * address. Which parts a particular value needs is a per-country question and only the
 * collection form knows the country, so requiring any here would leave a correctly filled
 * form unable to produce a valid value.
 *
 * What holds instead is that a value must name a part. What it says about that part is up
 * to it: a value sets the part, an empty one clears it. Storing a record with nothing in
 * it is not something this has to prevent — a part with no value gets no row.
 *
 * The type check below is load-bearing rather than defensive. An optional part that is
 * explicitly undefined survives parsing as a key holding undefined, and a bare presence
 * check would let `{line1: undefined}` through as if it named something.
 */
function record<F extends Record<string, PartSchema>>(fields: F) {
    // `Object.fromEntries` widens away the key-to-schema mapping, so the shape is
    // restated for the type system. Without it a record's value infers as `unknown` and
    // every type built on one goes with it.
    const shape = Object.fromEntries(
        Object.entries(fields).map(([key, part]) => [key, clearable(part)])
    ) as {[K in keyof F]: ReturnType<typeof clearable<F[K]>>};

    const value = z.object(shape).refine(
        parts => Object.values(parts).some(part => typeof part === 'string'),
        {message: 'A value must name at least one part.'}
    );

    return {value, fields};
}

export const FIELD_TYPES = defineFieldTypes({
    short_text: shortText(),
    long_text: longText(),
    // An address is a delivery address, so its bounds are what a courier will accept
    // rather than what the column could hold. Modelled on Stripe's Address object.
    address: record({
        line1: shortText(),
        line2: shortText(),
        city: shortText(),
        state: shortText(),
        postal_code: postalCode(),
        country: countryCode()
    })
});

/**
 * An address value, for the admin types built on it. Named separately because admin
 * speaks of an address, where the catalog only knows a record of parts.
 */
export const AddressValue = FIELD_TYPES.address.value;
export type Address = z.infer<typeof AddressValue>;

/**
 * The parts of a record type in declaration order, or null for a leaf.
 *
 * Read from the declaration rather than reverse-engineered from the schema it produced,
 * so adding a part is one edit and every consumer — the CSV columns, the paths a filter
 * may address, what admin renders — sees it.
 */
export function subFieldsOf(type: FieldType): string[] | null {
    // Read through the interface rather than off the literal: a leaf has no `fields` key
    // at all, and this is the one place that has to treat both kinds the same way.
    const {fields}: FieldTypeDefinition = FIELD_TYPES[type];
    return fields ? Object.keys(fields) : null;
}
