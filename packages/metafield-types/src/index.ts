import { z } from 'zod';
import { KeySchema, NamespaceSchema } from './identity.js';
import {
  FIELD_TYPE_IDS,
  matchLeaf,
  matchShape,
  type FieldType,
  type FieldTypeOfShape,
  type Leaf,
  type ListSource,
  type SettingsOf,
  type TextSize,
  type TypedSettings,
  type ValueOf,
} from './structure.js';

// Re-exported so a caller that needs both halves still has one import. The split is
// about what a bundle pays for, not about where the catalog lives.
export {
  FIELD_STRUCTURES,
  FIELD_TYPE_IDS,
  LIST_SOURCES,
  TEXT_SIZES,
  choice,
  country,
  isFieldType,
  isRecordValue,
  matchLeaf,
  matchShape,
  partsOf,
  text,
  type ChoiceLeaf,
  type FieldShape,
  type FieldStructure,
  type FieldType,
  type FieldTypeOfShape,
  type Leaf,
  type LeafHandlers,
  type LeafKind,
  type ListSource,
  type PartsOf,
  type RecordStructure,
  type ScalarStructure,
  type SettingsOf,
  type ShapeHandlers,
  type ShapeOf,
  type StructureOf,
  type TextLeaf,
  type TextSize,
  type TypedSettings,
  type ValueOf,
} from './structure.js';

/**
 * The shared catalog of member metafield types.
 *
 * ## What a field type is
 *
 * A publisher defines fields; a field has a type; a type says what a valid value is. That
 * last statement lives here and nowhere else, so that Ghost core, which enforces it, and
 * admin, which gives instant feedback against it, cannot disagree about what is valid.
 *
 * A type is composed of leaves, each one value with its own rule. Most types are a single
 * leaf. An address is a *record*: a set of named parts, each a leaf, from which the whole
 * type's rule is derived. A part is always a leaf, never a record itself.
 *
 * ## What a write may say
 *
 * A value is text, and so is every part of one. A write names what it means to change: a
 * name it does not mention is left as it was, and a name given an empty string is being
 * cleared. That is why every part accepts empty regardless of its own rule — emptying is
 * a statement about the write, not about the part.
 *
 * A name nobody recognizes is an error rather than a silent drop, at both depths. A
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
 * against validity — the sentences above are presentation. Admin and Portal each label a
 * record's parts in their own words, and each is held against the catalog by a type, so a
 * part added there fails to compile in both until it has a label.
 */

export const FieldTypeSchema = z.enum(FIELD_TYPE_IDS);

/**
 * What the member whose record it is may do with a field.
 *
 * A property of a definition rather than of the publisher's namespace, so it has an
 * answer for any regime that ever stores definitions, not only the publisher's.
 *
 * Ordered: `write` includes being able to read. Naming the levels for a publisher is
 * presentation and stays with whoever renders them.
 */
export const MEMBER_ACCESS_LEVELS = ['none', 'read', 'write'] as const;
export type MemberAccess = (typeof MEMBER_ACCESS_LEVELS)[number];
export const MemberAccessSchema = z.enum(MEMBER_ACCESS_LEVELS);
export const MEMBER_ACCESS = {
  none: 'none',
  read: 'read',
  write: 'write',
} as const satisfies Record<MemberAccess, MemberAccess>;

/**
 * Whether a field is in use. An archived field keeps its definition and the values members
 * hold for it, so it can be restored, but it takes no new values and members no longer see it.
 */
export const FIELD_STATUSES = ['active', 'archived'] as const;
export type FieldStatus = (typeof FIELD_STATUSES)[number];
export const FieldStatusSchema = z.enum(FIELD_STATUSES);
export const FIELD_STATUS = {
  active: 'active',
  archived: 'archived',
} as const satisfies Record<FieldStatus, FieldStatus>;

/** A field whose type has nothing to set up carries null, and a write may leave it out. */
const NO_SETTINGS = z.null({ error: 'This type of field has no settings.' }).default(null);

/**
 * A type paired with its settings: checked against the rules of `written` when a field is
 * written, and read back by `read` for their shape alone, so a rule tightened later never hides a
 * field set up under the old one.
 */
const typedSettingsOf = <
  T extends FieldType,
  W extends z.ZodType<SettingsOf<T>, unknown>,
  R extends z.ZodType<SettingsOf<T>, unknown>,
>(
  type: T,
  written: W,
  read: R,
) => ({
  written: z.object({ type: z.literal(type), settings: written }),
  read: z.object({ type: z.literal(type), settings: read }),
});

/** What a field of each type is set up with, keyed so a type missing from it fails to compile. */
const TYPED_SETTINGS = {
  short_text: typedSettingsOf('short_text', NO_SETTINGS, NO_SETTINGS),
  long_text: typedSettingsOf('long_text', NO_SETTINGS, NO_SETTINGS),
  address: typedSettingsOf('address', NO_SETTINGS, NO_SETTINGS),
} satisfies {
  [T in FieldType]: Record<
    'written' | 'read',
    z.ZodType<{ type: T; settings: SettingsOf<T> }, unknown>
  >;
};

const TYPE_ERROR = { error: 'Choose a type of custom field.' };

// A union is never empty, so the catalog's first type is named apart from the rest.
const [firstType, ...otherTypes] = FIELD_TYPE_IDS;

/**
 * A field's type and settings as a write states them, checked together and against the rules:
 * the settings must be what that type is set up with, so a type with nothing to set up
 * carries none.
 */
export const TypedSettingsInputSchema = z.discriminatedUnion(
  'type',
  [TYPED_SETTINGS[firstType].written, ...otherTypes.map((type) => TYPED_SETTINGS[type].written)],
  TYPE_ERROR,
) satisfies z.ZodType<TypedSettings, unknown>;

/** A field's type and settings as they are read back: paired, but checked for their shape alone. */
export const TypedSettingsSchema = z.discriminatedUnion(
  'type',
  [TYPED_SETTINGS[firstType].read, ...otherTypes.map((type) => TYPED_SETTINGS[type].read)],
  TYPE_ERROR,
) satisfies z.ZodType<TypedSettings, unknown>;

/**
 * A field definition as the Admin and Members APIs return it. Ghost writes every definition through
 * this and Admin reads every one through it, so both ends are checked against one shape. Portal
 * uses the type without the check, because zod would add to every page view on every site. Dates
 * are ISO strings, as JSON carries them.
 */
export const MetafieldDefinitionSchema = z.object({
  namespace: NamespaceSchema,
  key: KeySchema,
  name: z.string(),
  type: FieldTypeSchema,
  status: FieldStatusSchema,
  access: z.object({ member: MemberAccessSchema }),
  created_at: z.iso.datetime(),
  updated_at: z.iso.datetime().nullable(),
});
export type MetafieldDefinition = z.output<typeof MetafieldDefinitionSchema>;

/**
 * Where a change to a member's values was made, as a member's activity feed names it.
 * Shared so a place added on the server is one Admin has to be told how to describe.
 */
export const METAFIELD_CHANGE_SOURCES = [
  'admin',
  'admin_api',
  'portal',
  'import',
  'checkout',
] as const;
export type MetafieldChangeSource = (typeof METAFIELD_CHANGE_SOURCES)[number];

/** Whether a source is one this build knows how to name; a newer server can send others. */
export const isMetafieldChangeSource = (source: string): source is MetafieldChangeSource =>
  METAFIELD_CHANGE_SOURCES.some((known) => known === source);

/** A field as an activity feed entry names it: its name is copied so the entry outlives a rename. */
export const MetafieldChangeEventFieldSchema = z.object({
  namespace: z.string(),
  key: z.string(),
  name: z.string(),
});
export type MetafieldChangeEventField = z.infer<typeof MetafieldChangeEventFieldSchema>;

/**
 * An entry on a member's activity feed saying which fields a write changed, as the members
 * events endpoint returns it. The server builds it and Admin reads it, so both are held to
 * this one shape. `created_at` is a date on the server and its serialised string in a
 * client. `source` stays open to places a newer server adds.
 */
export interface MetafieldChangeEntry<TDate = string> {
  id: string;
  member_id: string;
  written_by_type: string;
  written_by_id: string | null;
  source: MetafieldChangeSource | (string & {});
  metafields: MetafieldChangeEventField[];
  created_at: TDate;
}

/**
 * Bytes, not characters, because MySQL TEXT holds 65,535 of them: a character bound would
 * accept a multibyte value the column cannot hold, and 65,535 emoji is four times over.
 */
export const MAX_LONG_TEXT_BYTES = 65535;

// TextEncoder rather than Buffer: this package runs in the browser too.
const byteLength = (value: string): number => new TextEncoder().encode(value).length;

/**
 * Every leaf's rule is built from this, so no two leaves can disagree about whitespace: a value
 * of nothing but spaces is nothing, whichever field it was typed into. Trimming first also makes
 * each bound measure the value rather than its padding.
 */
const trimmed = () => z.string({ error: 'Enter text.' }).trim();

/**
 * Pinned to a string at both ends because storage keeps one string per leaf: a rule parsing to
 * anything else could be written and never read back.
 */
type LeafRule = z.ZodType<string, string>;

/** Each text size's bound. Each message is a literal, so it can be a translation key. */
const TEXT_RULES: { [S in TextSize]: () => LeafRule } = {
  line: () => trimmed().max(255, { error: 'Use 255 characters or fewer.' }),

  // A sanity limit rather than a format, used for postal codes: they vary too much between
  // countries to check the shape of one without knowing the country, and the country is a
  // sibling part rather than something this can see.
  code: () => trimmed().max(32, { error: 'Use 32 characters or fewer.' }),

  long: () =>
    trimmed().refine((value) => byteLength(value) <= MAX_LONG_TEXT_BYTES, {
      error: 'This text is too long to save. Shorten it a little.',
    }),
};

/** Which keys each list accepts. */
const LIST_RULES: { [F in ListSource]: () => LeafRule } = {
  // The shape of an ISO 3166-1 alpha-2 code, deliberately not checked against the list of them.
  // Membership of that list is contested, and a closed list here would make Ghost the arbiter of
  // it for every member of every site. Clients offer countries to pick from without this deciding
  // which ones exist.
  //
  // Case is normalized so that `gb` and `GB` are not two values for one place, which a filter for
  // either would silently half-miss. Checked as two ASCII letters on the way in rather than by
  // length on the way out, because uppercasing does not preserve length: `ß` becomes `SS`.
  countries: () =>
    trimmed()
      .regex(/^[A-Za-z]{2}$/, { error: 'Enter a 2-letter country code, like US.' })
      .toUpperCase(),
};

const leafRule = (leaf: Leaf): LeafRule =>
  matchLeaf(leaf, {
    text: ({ size }) => TEXT_RULES[size](),
    choice: ({ from }) => LIST_RULES[from](),
  });

/**
 * A part as a write may name it: absent, empty, or a value of its own leaf. A rule that is a bound
 * would admit empty on its own; one that is a format would not, and would leave its part the only
 * one that could be set but never removed.
 */
const clearable = (rule: LeafRule) =>
  trimmed()
    .pipe(z.union([z.literal(''), rule]))
    .optional();

/** What each record type says when a write names none of its parts. */
const RECORD_EMPTY: { [T in FieldTypeOfShape<'record'>]: string } = {
  address: 'Enter at least one part of the address.',
};

/**
 * A value of any field type, as a caller holding a field of unknown type must accept it.
 */
export type FieldValue = ValueOf<FieldType>;

export type Address = ValueOf<'address'>;

/**
 * A type's rule, derived from its composition. Throws for a type this build doesn't know, as
 * `matchShape` does.
 *
 * A record's parts are all optional, because none of an address's exists everywhere: there is no
 * postal code in Ireland or Hong Kong, and no city in an Irish townland address. What holds instead
 * is that a value names at least one part. The check is on each part being a string because an
 * optional part that is explicitly undefined survives parsing as a key holding undefined, and a
 * bare presence check would let `{line1: undefined}` through as if it named something.
 *
 * A record is strict, so a part nobody declared is refused rather than dropped, in zod's wording,
 * which names the offending key.
 */
function ruleOf(type: FieldType): z.ZodType<FieldValue> {
  return matchShape<z.ZodType<FieldValue>>(type, {
    scalar: ({ leaf }) => leafRule(leaf),
    record: ({ parts }, recordType) =>
      z
        .strictObject(
          Object.fromEntries(
            Object.entries(parts).map(([part, leaf]) => [part, clearable(leafRule(leaf))]),
          ),
        )
        .refine((value) => Object.values(value).some((entry) => typeof entry === 'string'), {
          error: RECORD_EMPTY[recordType],
        }),
  });
}

// Built once per type: Ghost checks every value an import writes, and Admin every keystroke.
const RULES = new Map<FieldType, z.ZodType<FieldValue>>(
  FIELD_TYPE_IDS.map((type) => [type, ruleOf(type)]),
);

/**
 * The rule a value of one field must satisfy. It takes the field rather than its type so that a
 * rule depending on the field's own setup, such as the options a list field offers, changes here
 * and nowhere else; such a rule is built from the field rather than kept per type. Throws for a
 * type this build doesn't know.
 */
export function valueSchemaFor(field: { type: FieldType }): z.ZodType<FieldValue> {
  return RULES.get(field.type) ?? ruleOf(field.type);
}
