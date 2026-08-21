import { z } from 'zod';

/**
 * The shared catalog of member custom field types.
 *
 * ## What a field type is
 *
 * A publisher defines fields; a field has a type; a type says what a valid value is. That
 * last statement lives here and nowhere else, so that Ghost core, which enforces it, and
 * admin, which gives instant feedback against it, cannot disagree about what is valid.
 *
 * A type is one of two things. Most are a value in their own right, declared as the
 * schema that value must satisfy. An address is a *record*: a set of named parts, each a
 * value in the same sense, from which the whole type's schema is derived. Nothing stops a
 * part being a record itself.
 *
 * ## What a write may say
 *
 * A value is text, and so is every part of one. A write names what it means to change: a
 * name it does not mention is left as it was, and a name given an empty string is being
 * cleared. That is why every part accepts empty regardless of its own rule — emptying is
 * a statement about the write, not about the part.
 *
 * A name nobody recognises is an error rather than a silent drop, at both depths. A
 * misspelled field key is refused by the values service, which alone knows which fields a
 * site has defined; a misspelled part is refused here, because a type's parts are declared
 * in this file and nowhere else. Each is enforced where the names are known.
 *
 * ## What a failure says
 *
 * A rule carries the sentence shown when it is broken, so the two cannot drift. Each
 * states what is expected rather than what went wrong, so one sentence covers every way
 * of breaking that rule.
 *
 * The sentences are plain literals with no interpolation, so each is usable as a
 * translation key. Nothing here translates: Ghost's parser reads `t()` calls out of the
 * app that renders a string, so that app owns the step. Admin, the only one today, is not
 * translated at all.
 *
 * Two failures keep zod's own wording, both reachable only by a client sending the wrong
 * JSON shape: a composite handed something that is not an object, and a part nobody
 * declared. Naming the offending key serves whoever has to fix that client.
 *
 * ## What this package will not do
 *
 * No presentation beyond that sentence: labels, icons and input controls belong to the
 * frontend, and so does any wording that depends on where it appears rather than on which
 * rule was broken. No storage: columns and codecs belong to the backend. One exception
 * lives in `./csv` — how a value maps onto CSV columns — because both tiers need the same
 * answer and a disagreement between them is a file that silently stops round-tripping.
 *
 * The line is whether more than one renderer must agree on a string, not presentation
 * against validity — the sentences above are presentation. Admin is the only renderer
 * today, so a part's label lives there, held against this file by a type. A Portal
 * collection form, which cannot reach admin's packages, moves the labels here.
 */

/** The source for the union type, the zod enum and the `FIELD_TYPES` keys alike. */
export const FIELD_TYPE_IDS = ['short_text', 'long_text', 'address'] as const;
export type FieldType = (typeof FIELD_TYPE_IDS)[number];
export const FieldTypeSchema = z.enum(FIELD_TYPE_IDS);

/**
 * Bytes, not characters, because MySQL TEXT holds 65,535 of them: a character bound would
 * accept a multibyte value the column cannot hold, and 65,535 emoji is four times over.
 */
export const MAX_LONG_TEXT_BYTES = 65535;

// TextEncoder rather than Buffer: this package runs in the browser too.
const byteLength = (value: string): number => new TextEncoder().encode(value).length;

/**
 * Every value and every part is built from this, so no two types can disagree about
 * whitespace: a value of nothing but spaces is nothing, whichever field it was typed
 * into. Trimming first also makes each bound measure the value rather than its padding.
 *
 * Builders are named after what a value is rather than taking a size, so that a bound
 * lives with everything else true of that thing instead of as a number at the call site.
 */
const text = () => z.string({ error: 'Enter text.' }).trim();

const shortText = () => text().max(255, { error: 'Use 255 characters or fewer.' });

const longText = () =>
  text().refine((value) => byteLength(value) <= MAX_LONG_TEXT_BYTES, {
    error: 'This text is too long to save. Shorten it a little.',
  });

/**
 * A postal code, bounded well under a street address because no country's is long. The
 * bound is a sanity limit rather than a format: postal codes vary too much between
 * countries to check the shape of one without knowing which country it is for, and the
 * country is a sibling part rather than something this can see.
 */
const postalCode = () => text().max(32, { error: 'Use 32 characters or fewer.' });

/**
 * The shape of an ISO 3166-1 alpha-2 code, deliberately not checked against the list of
 * them. Membership of that list is contested, and a closed list here would make Ghost the
 * arbiter of it for every member of every site. The collection form can offer countries to
 * pick from without this deciding which ones exist.
 *
 * Case is normalised so that `gb` and `GB` are not two values for one place, which a
 * filter for either would silently half-miss.
 *
 * Checked as two ASCII letters on the way in rather than by length on the way out, because
 * uppercasing does not preserve length: `ß` becomes `SS` and `aß` becomes `ASS`.
 */
const countryCode = () =>
  text()
    .regex(/^[A-Za-z]{2}$/, { error: 'Enter a 2-letter country code, like US.' })
    .toUpperCase();

/**
 * Both ends are pinned to a string because storage keeps one string per leaf: a type
 * parsing to anything else could be written and never read back, which is better learned
 * from the compiler than from a 500 on the first save.
 */
type PartSchema = z.ZodType<string, string>;

/**
 * A part as a write may name it: absent, empty, or a value of its own kind.
 *
 * A rule that is a bound would admit empty on its own; one that is a format would not,
 * and would leave its part the only one that could be set but never removed.
 */
const clearable = <T extends PartSchema>(part: T) =>
  text()
    .pipe(z.union([z.literal(''), part]))
    .optional();

export interface FieldTypeDefinition {
  value: z.ZodType;
  /**
   * A record type's parts, in declaration order. Each part's own rule, and nothing
   * about how a write may name it: validate against `value`, never against these.
   */
  fields?: Record<string, PartSchema>;
}

type FieldTypeDeclaration = PartSchema | FieldTypeDefinition;

type Defined<D> = D extends z.ZodType ? { value: D } : D;

/** A type that is simply a value is declared as one; a record announces itself. */
function defineFieldTypes<D extends Record<FieldType, FieldTypeDeclaration>>(
  declarations: D,
): { [K in keyof D]: Defined<D[K]> } {
  // Restated for the type system, which cannot follow a conditional through
  // `Object.fromEntries`.
  return Object.fromEntries(
    Object.entries(declarations).map(([type, declared]) => [
      type,
      declared instanceof z.ZodType ? { value: declared } : declared,
    ]),
  ) as { [K in keyof D]: Defined<D[K]> };
}

/**
 * Every part is optional, because none of an address's exists everywhere: there is no
 * postal code in Ireland or Hong Kong, and no city in an Irish townland address. Which
 * parts a value needs is a per-country question, and only the collection form knows the
 * country. What holds instead is that a value must name at least one part.
 *
 * The type check below is load-bearing rather than defensive. An optional part that is
 * explicitly undefined survives parsing as a key holding undefined, and a bare presence
 * check would let `{line1: undefined}` through as if it named something.
 */
function record<F extends Record<string, PartSchema>>(fields: F, { error }: { error: string }) {
  // Restated for the type system, which loses the key-to-schema mapping through
  // `Object.fromEntries`; without it every type built on a record infers as `unknown`.
  const shape = Object.fromEntries(
    Object.entries(fields).map(([key, part]) => [key, clearable(part)]),
  ) as { [K in keyof F]: ReturnType<typeof clearable<F[K]>> };

  // Strict, so a part nobody declared is refused rather than dropped. That refusal keeps
  // zod's wording, which names the offending key.
  const value = z
    .strictObject(shape)
    .refine((parts) => Object.values(parts).some((part) => typeof part === 'string'), { error });

  return { value, fields };
}

export const FIELD_TYPES = defineFieldTypes({
  short_text: shortText(),
  long_text: longText(),
  // An address is a delivery address, so its bounds are what a courier will accept
  // rather than what the column could hold. Modelled on Stripe's Address object.
  address: record(
    {
      line1: shortText(),
      line2: shortText(),
      city: shortText(),
      state: shortText(),
      postal_code: postalCode(),
      country: countryCode(),
    },
    { error: 'Enter at least one part of the address.' },
  ),
});

/** Named for the admin types built on it, which speak of an address rather than a record. */
export const AddressValue = FIELD_TYPES.address.value;
export type Address = z.infer<typeof AddressValue>;

/**
 * A value of any field type, as a caller holding a field of unknown type must accept it.
 *
 * Derived from the schemas rather than listed, so a type added here widens it without
 * anyone remembering to.
 */
export type FieldValue = { [T in FieldType]: z.infer<(typeof FIELD_TYPES)[T]['value']> }[FieldType];

/**
 * The parts a record type declares, or never for a type whose value is a single thing.
 *
 * Distributed over `T`, so a caller holding a type it only knows as `FieldType` gets every
 * part any type declares rather than the empty intersection of all of them.
 */
export type PartsOf<T extends FieldType> = T extends FieldType
  ? (typeof FIELD_TYPES)[T] extends { fields: infer F }
    ? Extract<keyof F, string>
    : never
  : never;

/**
 * The parts of a record type in declaration order, or null for a type with none.
 *
 * Typed to the parts the caller's type declares, so a caller holding one of these can
 * index a value of that type without restating which parts exist.
 */
export function subFieldsOf<T extends FieldType>(type: T): PartsOf<T>[] | null {
  // Through the interface, not the literal: a type with no parts has no `fields` key.
  // Optional because a caller built against an older catalog than the server it talks to
  // reaches here with a type this build has never heard of, which reads as no parts.
  const definition: FieldTypeDefinition | undefined = FIELD_TYPES[type];
  // The keys are `PartsOf<T>` by construction: `fields` is the object it reads `keyof` from.
  return definition?.fields ? (Object.keys(definition.fields) as PartsOf<T>[]) : null;
}
