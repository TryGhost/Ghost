// The full metadata, so a valid number is one a country has given out rather than one of the right
// length, as the default metadata would have it.
import {
  getExampleNumber,
  isSupportedCountry,
  parsePhoneNumberFromString,
  validatePhoneNumberLength,
  type CountryCode,
} from 'libphonenumber-js/max';
import examples from 'libphonenumber-js/mobile/examples';
import { z } from 'zod';
import { KeySchema, NamespaceSchema } from './identity.js';
import { readCallingCode } from './phone.js';
import {
  FIELD_STRUCTURES,
  FIELD_TYPE_IDS,
  MAX_OPTIONS,
  MIN_OPTIONS,
  OPTION_SEPARATOR,
  optionKey,
  optionText,
  type FieldType,
  type FieldTypeOfShape,
  type Leaf,
  type ListSource,
  type SetSettings,
  type SettingsOfShape,
  type FieldShape,
  type FieldOfShape,
  type LeafKind,
  type LeafValues,
  type TextFormat,
  type TextLeaf,
  type TypedSettings,
  type ValueOf,
  typesOfShape,
  type WriteOf,
} from './structure.js';
import { shaped, type ShapeWrite, type ShapedField } from './shapes.js';

export {
  FIELD_READING,
  LEAVES,
  SHAPES,
  editableValue,
  formShows,
  formTextOf,
  heldTextOf,
  formWrite,
  heldValue,
  leafFromText,
  shaped,
  shapedType,
  textOfValue,
  valueFromText,
  type AnyLeafValue,
  type FieldReading,
  type ShapeRules,
  type ShapeText,
  type ShapeValue,
  type ShapeWrite,
  type ShapedField,
  type ShapedType,
  type ValueKind,
  type ValueOfKind,
} from './shapes.js';

// Re-exported so a caller that needs both halves still has one import. The split is
// about what a bundle pays for, not about where the catalog lives.
export {
  FIELD_STRUCTURES,
  FIELD_TYPE_IDS,
  FIELD_TYPE_FLAGS,
  LIST_SOURCES,
  MAX_OPTIONS,
  MIN_OPTIONS,
  OPTION_SEPARATOR,
  TEXT_FORMATS,
  choice,
  country,
  editableAnswers,
  inOptionOrder,
  isCreatableType,
  isFieldType,
  isRecordValue,
  matchField,
  matchLeaf,
  matchShape,
  partsOf,
  text,
  type ChoiceLeaf,
  type FieldHandlers,
  type FieldOfShape,
  type FieldShape,
  type FieldStructure,
  type FieldType,
  type FieldTypeOfShape,
  type Leaf,
  type LeafHandlers,
  type LeafKind,
  type LeafValue,
  type LeafValues,
  type ListSource,
  type PartsOf,
  type RecordStructure,
  type ScalarStructure,
  type SetSettings,
  type SetStructure,
  type SettingsOf,
  type ShapeHandlers,
  type ShapeOf,
  type StructureOf,
  type TextLeaf,
  type TextFormat,
  type TypedSettings,
  type ValueOf,
  type WriteOf,
  keysOf,
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
 * A value is a leaf's value, and so is every part of one. A write names what it means to
 * change: a name it does not mention is left as it was, and a name given `null` is being
 * cleared, whatever kind of leaf it holds. That is why every part accepts `null` regardless of
 * its own rule: clearing is a statement about the write, not about the part. A value is never
 * empty, so text of nothing but spaces, or a list picking nothing, is refused rather than being
 * a second way of holding nothing.
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
 * translation key. The one exception is an invalid phone number, whose message includes an
 * example number from its country. Nothing here translates: Ghost's parser reads `t()` calls out of the
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

/**
 * A set field's settings as stored or sent back: their shape alone, which every read checks. A
 * write checks the rules `SetSettingsSchema` layers on top, so a rule tightened later never hides
 * a field set up under the old one, the way a value's rule never hides what a member already holds.
 */
export const SetSettingsShape = z.object(
  {
    options: z.array(z.string({ error: 'Enter text for each option.' }), {
      error: 'Give the list its options.',
    }),
    multiple: z.boolean({ error: 'Say whether members can pick more than one option.' }),
  },
  { error: 'Give the list its options.' },
) satisfies z.ZodType<SetSettings, unknown>;

/**
 * Why an option's text, once tidied, can't be written, or null when it can. Its text is all that
 * names it, so each bound is on the text as it is matched, and the separator a CSV cell joins
 * options with can't appear in one.
 */
function optionProblem(option: string): string | null {
  if (option.length === 0) {
    return 'Enter text for each option.';
  }
  if (option.length > 255) {
    return 'Use 255 characters or fewer for each option.';
  }
  if (option.includes(OPTION_SEPARATOR)) {
    return `Options can't contain ${OPTION_SEPARATOR}.`;
  }
  return null;
}

/**
 * What a set field is set up with: its shape, with each option's text tidied and the rules a write
 * must meet on top. Options are a set as well, so the same option, compared by `optionKey`, can't
 * be offered twice: the option that repeats an earlier one is refused, so a form shows the problem
 * beside the option to change. They are listed in the order they are shown.
 */
export const SetSettingsSchema = SetSettingsShape.transform(({ options, multiple }) => ({
  options: options.map(optionText),
  multiple,
})).check((ctx) => {
  const { options } = ctx.value;
  const offered = new Set<string>();
  options.forEach((option, index) => {
    const key = optionKey(option);
    const problem =
      optionProblem(option) ?? (offered.has(key) ? 'This option already exists.' : null);
    offered.add(key);
    if (problem) {
      ctx.issues.push({
        code: 'custom',
        message: problem,
        input: option,
        path: ['options', index],
      });
    }
  });
  const listProblem =
    options.length < MIN_OPTIONS
      ? `Give the list at least ${MIN_OPTIONS} options.`
      : options.length > MAX_OPTIONS
        ? `Give the list ${MAX_OPTIONS} options or fewer.`
        : null;
  if (listProblem) {
    ctx.issues.push({ code: 'custom', message: listProblem, input: options, path: ['options'] });
  }
}) satisfies z.ZodType<SetSettings, unknown>;

/**
 * A field whose type has nothing to set up has no settings, so a write that gives it some is
 * refused.
 */
const NO_SETTINGS = z.undefined({ error: 'Only a list field has settings.' }).optional();

const TYPE_ERROR = { error: 'Choose a type of custom field.' };

/**
 * What a field holds beside its type, `base`, with its type and the settings that type's shape
 * takes, held as `settings` says for each shape: a set's options, and nothing for any other shape.
 * One variant per shape, so a field's settings are always read against its type. Writes give the
 * rules, reads the shape alone, and Ghost's table its column.
 */
export const withTypedSettings = <
  Base extends z.ZodRawShape,
  ForScalar extends z.ZodType,
  ForRecord extends z.ZodType,
  ForSet extends z.ZodType,
>(
  base: Base,
  settings: { scalar: ForScalar; record: ForRecord; set: ForSet } & {
    [S in FieldShape]: z.ZodType;
  },
) => {
  // Keyed by shape, so a shape added to the catalog fails to compile here until it has a variant.
  const variants = {
    scalar: z.object({ ...base, type: z.enum(typesOfShape('scalar')), settings: settings.scalar }),
    record: z.object({ ...base, type: z.enum(typesOfShape('record')), settings: settings.record }),
    set: z.object({ ...base, type: z.enum(typesOfShape('set')), settings: settings.set }),
  } satisfies { [S in FieldShape]: z.ZodType };
  return z.discriminatedUnion('type', [variants.scalar, variants.record, variants.set], TYPE_ERROR);
};

/** Everything about the settings of a field of one shape. */
interface ShapeSettings<Settings> {
  /** The rules settings are checked against whenever they are written. */
  readonly written: z.ZodType<Settings, unknown>;
  /** The shape settings are checked for whenever they are read back. */
  readonly read: z.ZodType<Settings, unknown>;
  /**
   * What a field of the shape is set up with before anyone sets it up. A new field's form starts
   * from these, and Ghost reads a field with them when its stored settings can't be read, so the
   * field keeps working and the next write of its settings replaces them.
   */
  readonly defaults: Settings;
}

/**
 * Each shape's settings in one place: a set's options and whether a member picks several, and
 * nothing for any other shape. A list's defaults have no options, which a list's write rules
 * refuse, so an edit of a list read with its defaults always writes the settings it is given.
 * Keyed by shape, so a shape added to the catalog fails to compile until it has an entry.
 */
export const SHAPE_SETTINGS = {
  scalar: { written: NO_SETTINGS, read: NO_SETTINGS, defaults: undefined },
  record: { written: NO_SETTINGS, read: NO_SETTINGS, defaults: undefined },
  set: {
    written: SetSettingsSchema,
    read: SetSettingsShape,
    defaults: { options: [], multiple: false },
  },
} satisfies { readonly [S in FieldShape]: ShapeSettings<SettingsOfShape[S]> };

/** Each shape's settings as a write states them, checked against the rules. */
export const WRITTEN_SETTINGS = {
  scalar: SHAPE_SETTINGS.scalar.written,
  record: SHAPE_SETTINGS.record.written,
  set: SHAPE_SETTINGS.set.written,
};

/** Each shape's settings as they are read back, checked for their shape alone. */
export const READ_SETTINGS = {
  scalar: SHAPE_SETTINGS.scalar.read,
  record: SHAPE_SETTINGS.record.read,
  set: SHAPE_SETTINGS.set.read,
};

/**
 * Where a refusal points within what was sent: the path to the refused value, with its parts and
 * positions joined by dots, such as `settings.options.2` for a field's third option. Ghost names
 * a refusal's `property` this way, and a form files the problems it finds under the same keys, so
 * each lands beside the input that set the value.
 */
export function refusedProperty(path: readonly PropertyKey[]): string {
  return path.map(String).join('.');
}

/**
 * A field's type and settings as a write states them, checked together and against the rules:
 * the settings must be what that type is set up with, so a list carries its options and
 * nothing else carries any.
 */
export const TypedSettingsInputSchema = withTypedSettings({}, WRITTEN_SETTINGS) satisfies z.ZodType<
  TypedSettings,
  unknown
>;

/** A field's type and settings as they are read back: paired, but checked for their shape alone. */
export const TypedSettingsSchema = withTypedSettings({}, READ_SETTINGS) satisfies z.ZodType<
  TypedSettings,
  unknown
>;

/**
 * A field definition as the Admin and Members APIs return it. Ghost writes every definition through
 * this and Admin reads every one through it, so both ends are checked against one shape. Portal
 * uses the type without the check, because zod would add to every page view on every site. Dates
 * are ISO strings, as JSON carries them.
 */
export const MetafieldDefinitionSchema = withTypedSettings(
  {
    namespace: NamespaceSchema,
    key: KeySchema,
    name: z.string(),
    status: FieldStatusSchema,
    access: z.object({ member: MemberAccessSchema }),
    created_at: z.iso.datetime(),
    updated_at: z.iso.datetime().nullable(),
  },
  READ_SETTINGS,
);
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
 * Every text leaf's rule is built from this, so no two leaves can disagree about whitespace.
 * Trimming first also makes each bound measure the value rather than its padding.
 */
const trimmed = () => z.string({ error: 'Enter text.' }).trim();

/** Text that holds something: text of nothing but spaces is refused, since a write clears with `null`. */
const filled = () => trimmed().min(1, { error: 'Enter a value, or send null to clear it.' });

/**
 * A leaf's rule, parsing to the value its kind of leaf holds (`LeafValues`). Storage keeps each
 * kind of value in a column of its own, so a rule parsing to anything else could be written and
 * never read back.
 */
type LeafRule<K extends LeafKind = LeafKind> = z.ZodType<LeafValues[K], LeafValues[K]>;

/**
 * Why text isn't a valid phone number for a field. The country is checked first: the number has
 * no country code and no default country was given, or its country code doesn't exist. Otherwise
 * the number is invalid for its country: too short, too long, or not a number that country
 * issues. Those three reasons carry the country, so the error message can show an example from
 * it. The country is undefined for a code that belongs to no country, such as +870 for satellite
 * phones. A valid number can still be rejected for carrying an extension, which E.164 can't
 * represent.
 */
type PhoneRefusal =
  | { reason: 'countryCode' | 'unknownCode' | 'extension' }
  | { reason: 'tooShort' | 'tooLong' | 'invalid'; country: CountryCode | undefined };

/**
 * The country an invalid number was meant for: the one libphonenumber-js detected, or else the
 * one its country code belongs to. For a code shared by several countries that is the code's
 * main country, since only a valid number's digits distinguish them. The code is read from the
 * first +, so text before the number doesn't hide its country.
 */
function countryWrittenFor(written: string, placed: CountryCode | undefined) {
  const plus = written.indexOf('+');
  return placed ?? readCallingCode(plus < 0 ? written : written.slice(plus))?.country;
}

/**
 * A phone number in E.164, such as `+442079460000`, from however it was written: spaces, brackets,
 * dashes and a national 0 after the country code make no difference, but nothing else may surround
 * the number, as anything else would be lost. A number written without its country code is read
 * as it is dialled in `country`, when there is one. Otherwise it returns why the text was
 * rejected, as a `PhoneRefusal`.
 */
function readPhone(text: string, country?: string): { number: string } | { refused: PhoneRefusal } {
  const defaultCountry = country !== undefined && isSupportedCountry(country) ? country : undefined;
  // A country's own way of dialling abroad is read with the country. After that, a number written
  // after the 00 most countries dial abroad with gives its code as surely as one after a +.
  const given = text.trim();
  const international = given.startsWith('00') ? `+${given.slice(2)}` : undefined;
  let written = given;
  let read = parsePhoneNumberFromString(written, { defaultCountry, extract: false });
  if (!read?.isValid() && international) {
    written = international;
    read = parsePhoneNumberFromString(written, { extract: false });
  }
  if (read?.isValid()) {
    return read.ext ? { refused: { reason: 'extension' } } : { number: read.number };
  }
  // With a country code or a default country the country is known, so the problem is the number
  // itself or the text around it.
  const coded = written.includes('+');
  if (!coded && !defaultCountry) {
    return { refused: { reason: 'countryCode' } };
  }
  // libphonenumber-js decides whether a country code exists, since it also decides whether the
  // number is valid.
  const length = validatePhoneNumberLength(written, defaultCountry);
  if (length === 'INVALID_COUNTRY') {
    return { refused: { reason: 'unknownCode' } };
  }
  return {
    refused: {
      reason: length === 'TOO_SHORT' ? 'tooShort' : length === 'TOO_LONG' ? 'tooLong' : 'invalid',
      country: countryWrittenFor(written, read?.country) ?? (coded ? undefined : defaultCountry),
    },
  };
}

/**
 * A phone number in E.164, read as it is dialled in `country` unless it was written with a country
 * code of its own, or undefined when it isn't a number a phone field could keep. For a number that
 * comes with a country rather than a code, such as one Apple Pay or Google Pay passes on beside the
 * country of the buyer's card. Without a country a phone can belong to, only a number written with
 * its code is read.
 */
export function phoneNumberIn(text: string, country: string | undefined): string | undefined {
  const read = readPhone(text, country);
  return 'number' in read ? read.number : undefined;
}

/**
 * What a phone field's filter looks for, so it finds a number held in E.164 however staff wrote
 * it: a whole number in E.164, read as it is dialled in `country` unless it gives its code, and
 * part of one as the digits written, with a + for a code written after one. Each is what it gives
 * for itself too, as a filter is read back and looked for again.
 */
function phoneFilterText(typed: string, country: string | undefined): string {
  const whole = phoneNumberIn(typed, country);
  if (whole) {
    return whole;
  }
  const digits = typed.replace(/\(0\)/g, '').replace(/[^\d+]/g, '');
  // Nothing to look for: a filter that is only a + would find every number.
  return /\d/.test(digits) ? digits : '';
}

/**
 * How each text format reads what was typed into a filter, as its field holds its values, so a
 * filter compares like with like: as typed, or for a phone number as `phoneFilterText` reads it.
 */
const TEXT_FILTER_TEXT: {
  [F in TextFormat]: (typed: string, country: string | undefined) => string;
} = {
  line: (typed) => typed,
  code: (typed) => typed,
  long: (typed) => typed,
  phone: phoneFilterText,
};

/**
 * What a filter on a text leaf looks for, given what was typed and the country of whoever typed it:
 * the text as the leaf's field holds it, so a phone field's filter finds `+442079460000` from
 * `020 7946 0000` typed in the United Kingdom.
 */
export function filterTextFor(leaf: TextLeaf, typed: string, country: string | undefined): string {
  return TEXT_FILTER_TEXT[leaf.format](typed, country);
}

/** The example shown when the number's country is unknown. */
const ANY_EXAMPLE = '+44 20 7946 0000';

/**
 * An example number for `country`, formatted the way a phone field accepts it: with its country
 * code and the country's own grouping, such as `+55 11 96123 4567` for Brazil. libphonenumber-js
 * has one for every country it supports. The UK example is the fallback when the country is
 * unknown, or if the library ever lacks one for a country.
 */
const exampleOf = (country: CountryCode | undefined): string =>
  (country && getExampleNumber(country, examples)?.formatInternational()) ?? ANY_EXAMPLE;

/**
 * The error message for each reason `readPhone` rejects a phone number. A number invalid for its
 * country gets an example from that country, so someone in Brazil isn't shown a British one.
 */
function phoneRefused(refusal: PhoneRefusal): string {
  switch (refusal.reason) {
    case 'countryCode':
      return `Enter the phone number with its country code, starting with +, like ${ANY_EXAMPLE}.`;
    case 'unknownCode':
      return `Enter a phone number with a valid country code, like ${ANY_EXAMPLE}.`;
    case 'extension':
      return 'Enter the phone number without an extension.';
    case 'tooShort':
      return `This phone number is too short. Enter one like ${exampleOf(refusal.country)}.`;
    case 'tooLong':
      return `This phone number is too long. Enter one like ${exampleOf(refusal.country)}.`;
    case 'invalid':
      return `Enter a valid phone number, like ${exampleOf(refusal.country)}.`;
  }
}

/**
 * Each text format's rule. Each message is a literal, so it can be a translation key, except an
 * invalid phone number's, which includes an example number from its country.
 */
const TEXT_RULES: { [F in TextFormat]: () => LeafRule<'text'> } = {
  line: () => filled().max(255, { error: 'Use 255 characters or fewer.' }),

  // A sanity limit rather than a format, used for postal codes: they vary too much between
  // countries to check the shape of one without knowing the country, and the country is a
  // sibling part rather than something this can see.
  code: () => filled().max(32, { error: 'Use 32 characters or fewer.' }),

  long: () =>
    filled().refine((value) => byteLength(value) <= MAX_LONG_TEXT_BYTES, {
      error: 'This text is too long to save. Shorten it a little.',
    }),

  // Stored as E.164 whatever was typed, so the same number is one value wherever it came from.
  // Without a country code there is no telling which country a number belongs to.
  phone: () =>
    filled().transform((value, ctx) => {
      const read = readPhone(value);
      if ('refused' in read) {
        ctx.issues.push({ code: 'custom', message: phoneRefused(read.refused), input: value });
        return z.NEVER;
      }
      return read.number;
    }),
};

/** Which keys each list accepts. */
const LIST_RULES: { [F in ListSource]: () => LeafRule<'choice'> } = {
  // The shape of an ISO 3166-1 alpha-2 code, deliberately not checked against the list of them.
  // Membership of that list is contested, and a closed list here would make Ghost the arbiter of
  // it for every member of every site. Clients offer countries to pick from without this deciding
  // which ones exist.
  //
  // Case is normalized so that `gb` and `GB` are not two values for one place, which a filter for
  // either would silently half-miss. Checked as two ASCII letters on the way in rather than by
  // length on the way out, because uppercasing does not preserve length: `ß` becomes `SS`.
  countries: () =>
    filled()
      .regex(/^[A-Za-z]{2}$/, { error: 'Enter a 2-letter country code, like US.' })
      .toUpperCase(),
};

/** Each kind of leaf's rule. Keyed by kind, so a kind added to the catalog fails to compile here. */
const LEAF_RULES: { [K in LeafKind]: (leaf: Extract<Leaf, { leaf: K }>) => LeafRule<K> } = {
  text: ({ format }) => TEXT_RULES[format](),
  choice: ({ from }) => LIST_RULES[from](),
};

/** A leaf's rule, whichever kind of leaf it is. */
const leafRule = <K extends LeafKind>(leaf: Extract<Leaf, { leaf: K }>): LeafRule<K> =>
  LEAF_RULES[leaf.leaf](leaf);

/**
 * A part as a write may name it: absent to leave it alone, `null` to clear it, or a value of its
 * own leaf. Every part clears the same way, whatever its leaf's rule, so none can be set but never
 * removed.
 */
const part = (leaf: Leaf) => leafRule(leaf).nullable().optional();

/** What each record type says when a write names none of its parts. */
const RECORD_EMPTY: { [T in FieldTypeOfShape<'record'>]: string } = {
  address: 'Enter at least one part of the address.',
};

/**
 * A value of any field type, as a caller holding a field of unknown type must accept it.
 */
export type FieldValue = ValueOf<FieldType>;

/** A write to a field of any type, as a caller holding a field of unknown type must give it. */
export type FieldWrite = WriteOf<FieldType>;

export type Address = ValueOf<'address'>;

/**
 * A record type's rule, derived from its parts.
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
function recordRule(type: FieldTypeOfShape<'record'>): z.ZodType<ShapeWrite['record']> {
  return z
    .strictObject(
      Object.fromEntries(
        Object.entries(FIELD_STRUCTURES[type].parts).map(([name, leaf]) => [name, part(leaf)]),
      ),
    )
    .refine((value) => Object.values(value).some((entry) => entry !== undefined), {
      error: RECORD_EMPTY[type],
    });
}

/**
 * A set field's rule, from its own options: the text of each option picked, picking any option
 * once however often it is named, and only one of them when the field takes one. A failure is
 * reported against the whole field rather than at a position in the list, which a client would
 * read as an option named by a number.
 *
 * Checked when an answer is given and never again: a publisher can change the options later, and
 * an answer keeps what was picked.
 */
function setRule({ options, multiple }: SetSettings): z.ZodType<ShapeWrite['set']> {
  const offered = new Set(options);
  return z
    .array(z.unknown(), { error: 'Choose from the options this field offers.' })
    .transform((picked, ctx) => {
      const texts = picked.filter((option) => typeof option === 'string');
      if (texts.length < picked.length) {
        ctx.issues.push({
          code: 'custom',
          message: 'Choose from the options this field offers.',
          input: picked,
        });
        return z.NEVER;
      }
      return [...new Set(texts.map(optionText))];
    })
    .check((ctx) => {
      if (ctx.value.length === 0) {
        // A list holding nothing is no answer, which a write gives as `null`.
        ctx.issues.push({
          code: 'custom',
          message: 'Choose at least one option, or send null to clear it.',
          input: ctx.value,
        });
      } else if (ctx.value.some((option) => !offered.has(option))) {
        ctx.issues.push({
          code: 'custom',
          message: 'Choose from the options this field offers.',
          input: ctx.value,
        });
      } else if (!multiple && ctx.value.length > 1) {
        ctx.issues.push({ code: 'custom', message: 'Choose one option.', input: ctx.value });
      }
    });
}

/**
 * `build` run once per type, for a rule that comes from the type alone: Ghost checks every value an
 * import writes through these rules, and Admin every keystroke.
 */
function oncePerType<T extends FieldType, R>(build: (type: T) => R): (type: T) => R {
  const built = new Map<T, R>();
  return (type) => {
    const rule = built.get(type) ?? build(type);
    built.set(type, rule);
    return rule;
  };
}

const scalarRule = oncePerType((type: FieldTypeOfShape<'scalar'>) =>
  leafRule(FIELD_STRUCTURES[type].leaf),
);
const recordRuleOf = oncePerType(recordRule);

/**
 * Each shape's strict rule for a write, from what a field's type is composed of and, for a set,
 * the options the field offers. Keyed by shape, so a shape added to the catalog fails to compile
 * here until it has a rule.
 */
const WRITE_RULES: {
  readonly [S in FieldShape]: (field: FieldOfShape<S>) => z.ZodType<ShapeWrite[S]>;
} = {
  scalar: ({ type }) => scalarRule(type),
  record: ({ type }) => recordRuleOf(type),
  set: ({ settings }) => setRule(settings),
};

function writeRuleOf<S extends FieldShape>({
  shape,
  field,
}: ShapedField<TypedSettings, S>): z.ZodType<ShapeWrite[S]> {
  return WRITE_RULES[shape](field);
}

/** A field's rule, from what its type is composed of and, for a set, the options the field offers. */
function ruleOf(field: TypedSettings): z.ZodType<FieldWrite> {
  return writeRuleOf(shaped(field));
}

/**
 * A value a field's rule accepted for writing, tidied as the rule tidies it. Only `accept` makes
 * one, so a value that skipped the rule can't be handed to code that stores it.
 */
export type Accepted<S extends FieldShape> = ShapeWrite[S] & z.core.$brand<'accepted'>;

/** An accepted value with its shape, so a table keyed by shape can be indexed with it. */
export type AcceptedValue<S extends FieldShape = FieldShape> = {
  [K in S]: { readonly shape: K; readonly value: Accepted<K> };
}[S];

export type Acceptance<S extends FieldShape = FieldShape> =
  | { readonly success: true; readonly accepted: AcceptedValue<S> }
  | { readonly success: false; readonly issues: readonly z.core.$ZodIssue[] };

/**
 * Strict, for a write, under the field's rule today: only options the field offers now, one answer
 * when it takes one, and each part valid under its leaf's rule. What a held value reads as is
 * lenient instead, and is `FIELD_READING`'s to say.
 */
export function accept<S extends FieldShape>(
  of: ShapedField<TypedSettings, S>,
  raw: unknown,
): Acceptance<S> {
  const result = writeRuleOf(of).brand<'accepted'>().safeParse(raw);
  return result.success
    ? { success: true, accepted: acceptedAs(of.shape, result.data) }
    : { success: false, issues: result.error.issues };
}

function acceptedAs<S extends FieldShape>(shape: S, value: Accepted<S>): AcceptedValue<S> {
  return { shape, value };
}

/**
 * The rule a write to one field must satisfy, which parses to the write it accepts: a record's
 * part named as `null` clears it. It takes the field rather than its type so that a
 * rule depending on the field's own setup, such as the options a list field offers, changes here
 * and nowhere else; such a rule is built from the field rather than kept per type. Throws for a
 * type this build doesn't know.
 */
export function valueSchemaFor(field: TypedSettings): z.ZodType<FieldWrite> {
  return ruleOf(field);
}
