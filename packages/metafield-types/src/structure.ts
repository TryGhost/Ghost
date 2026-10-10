/**
 * What a field type is made of, with no opinion on what a valid value looks like.
 *
 * This is the half of the catalog a renderer needs. Drawing an address means knowing
 * it has six parts, in that order, and that the last of them holds a country code —
 * nothing about lengths, formats, or what happens when one is left blank.
 *
 * It is separate from `./index` because that half is built out of zod, and zod is
 * sixty-odd kilobytes. Ghost's server enforces the rules and can afford them; Portal
 * only draws the inputs, and it loads on every page view of every themed site. Split
 * this way a renderer imports well under a kilobyte and still gets the types.
 *
 * The two halves cannot drift, because the schemas are built from these declarations
 * rather than beside them: adding a part here without a rule in `./index` fails to
 * compile.
 */

/** The source for the union type, the zod enum and the `FIELD_TYPES` keys alike. */
export const FIELD_TYPE_IDS = ['short_text', 'long_text', 'address'] as const;
export type FieldType = (typeof FIELD_TYPE_IDS)[number];

/**
 * What kind of thing a type's value is, as anything comparing values needs to know.
 *
 * Coarser than the type: `short_text` and `long_text` are both text, and differ only in
 * how much of it. This is the level at which a value can be ordered, matched or grouped,
 * so it is what a filter, a sort or an export reads to decide how to treat a value —
 * without either of them enumerating the types themselves.
 *
 * Deliberately not presentation: it says a value is a date, not that its operator is
 * called "is before". Naming the operators stays with whoever renders them.
 */
export const FIELD_KINDS = ['text', 'date', 'number', 'record'] as const;
export type FieldKind = (typeof FIELD_KINDS)[number];

/**
 * The types a composite's parts can declare. A country code and a postal code both
 * store short text, but they are different things — the part's type is what a control
 * or a filter dispatches on, the way a field's own type is for a scalar.
 */
export const PART_TYPE_IDS = ['short_text', 'postal_code', 'country_code'] as const;
export type PartType = (typeof PART_TYPE_IDS)[number];

/**
 * Which parts each type has, in the order they are shown, and what each part holds.
 * `null` for a type whose value is a single thing.
 *
 * An address is a delivery address, modeled on Stripe's Address object. Who the parcel
 * is addressed to is not here: a parcel needs a name as well as an address, but that is
 * a fact about posting parcels rather than about either type, and the name is often not
 * the account name — gift subscriptions, workplace deliveries, c/o. A site that needs
 * one keeps it in a field of its own, which is also how Stripe hands it back.
 */
export const FIELD_PARTS = {
  short_text: null,
  long_text: null,
  address: {
    line1: 'short_text',
    line2: 'short_text',
    city: 'short_text',
    state: 'short_text',
    postal_code: 'postal_code',
    country: 'country_code',
  },
} as const satisfies Record<FieldType, Readonly<Record<string, PartType>> | null>;

/**
 * The parts a record type declares, or never for a type whose value is a single thing.
 *
 * Distributed over `T`, so a caller holding a type it only knows as `FieldType` gets
 * every part any type declares rather than the empty intersection of all of them.
 */
export type PartsOf<T extends FieldType> = T extends FieldType
  ? (typeof FIELD_PARTS)[T] extends null
    ? never
    : Extract<keyof (typeof FIELD_PARTS)[T], string>
  : never;

/**
 * The parts of a record type in declaration order, or null for a type with none.
 *
 * Typed to the parts the caller's type declares, so a caller holding one of these can
 * index a value of that type without restating which parts exist.
 */
export function subFieldsOf<T extends FieldType>(type: T): PartsOf<T>[] | null {
  // Optional because a caller built against an older catalog than the server it talks
  // to reaches here with a type this build has never heard of, which reads as no parts.
  const parts: Readonly<Record<string, PartType>> | null | undefined = FIELD_PARTS[type];
  return parts ? (Object.keys(parts) as PartsOf<T>[]) : null;
}

/** Each part's declared type, keyed by part; null for a type with none, and for one this build has never heard of. */
export function partTypesOf<T extends FieldType>(type: T): Record<PartsOf<T>, PartType> | null {
  const parts: Readonly<Record<string, PartType>> | null | undefined = FIELD_PARTS[type];
  return parts ? ({ ...parts } as Record<PartsOf<T>, PartType>) : null;
}
