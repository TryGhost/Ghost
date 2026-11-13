/**
 * What a field type is made of, with no opinion on what a valid value looks like.
 *
 * Every type is composed from a few building blocks. A leaf is one value: text of a format, a
 * choice from a list. A type is a leaf on its own, a record of named leaves, or a set of options its
 * field offers. Everything that stores, exports, edits, filters or draws a value is written
 * once per building block, so a type composed from existing blocks needs nothing beyond its entry
 * here.
 *
 * This half is separate from `./index` because that half is built out of zod and libphonenumber-js,
 * and together they are well over a hundred kilobytes. Ghost's server enforces the rules and can
 * afford them; Portal only draws the inputs, and it loads on every page view of every themed site.
 */

/**
 * What a text leaf holds: a line of text, a short code, long text, or a phone number. Each format
 * has its rule, and its messages, in `./index`, and its own input in Admin and Portal.
 */
export const TEXT_FORMATS = ['line', 'code', 'long', 'phone'] as const;
export type TextFormat = (typeof TEXT_FORMATS)[number];

/** The lists a choice can pick from. Each list says which keys it accepts in `./index`. */
export const LIST_SOURCES = ['countries'] as const;
export type ListSource = (typeof LIST_SOURCES)[number];

export interface TextLeaf {
  readonly leaf: 'text';
  readonly format: TextFormat;
}

export interface ChoiceLeaf {
  readonly leaf: 'choice';
  readonly from: ListSource;
}

/** One value. */
export type Leaf = TextLeaf | ChoiceLeaf;
export type LeafKind = Leaf['leaf'];

/** What a value of each kind of leaf is, as JSON carries it. */
export interface LeafValues {
  text: string;
  choice: string;
}

export type LeafValue<L extends Leaf> = LeafValues[L['leaf']];

export const text = <const F extends TextFormat>(format: F) => ({ leaf: 'text', format }) as const;
export const choice = <const F extends ListSource>(from: F) => ({ leaf: 'choice', from }) as const;

/** A country, as the two-letter code a list of countries offers. */
export const country = choice('countries');

/** A type whose value is one leaf. */
export interface ScalarStructure {
  readonly shape: 'scalar';
  readonly leaf: Leaf;
}

/**
 * A type whose value is a leaf per named part. Parts are listed in the order they are shown, and
 * that order is relied on wherever parts are laid out.
 */
export interface RecordStructure {
  readonly shape: 'record';
  readonly parts: Readonly<Record<string, Leaf>>;
}

/**
 * A type whose value is some of the options its field offers, each named by its text. Which
 * options there are, and whether a member picks one or several, are settings of the field rather
 * than of its type, so each field asks a question of its own.
 */
export interface SetStructure {
  readonly shape: 'set';
}

export type FieldStructure = ScalarStructure | RecordStructure | SetStructure;
export type FieldShape = FieldStructure['shape'];

/** The source for the union type, the zod enum and the `FIELD_STRUCTURES` keys alike. */
export const FIELD_TYPE_IDS = ['short_text', 'long_text', 'list', 'address', 'phone'] as const;
export type FieldType = (typeof FIELD_TYPE_IDS)[number];

/**
 * What each type is composed of.
 *
 * An address is a delivery address, modeled on Stripe's Address object. Who the parcel is
 * addressed to is not here: a parcel needs a name as well as an address, but that is a fact about
 * posting parcels rather than about either type, and the name is often not the account name, as
 * with gift subscriptions, workplace deliveries or c/o. A site that needs one keeps it in a field of
 * its own, which is also how Stripe hands it back.
 */
export const FIELD_STRUCTURES = {
  short_text: { shape: 'scalar', leaf: text('line') },
  long_text: { shape: 'scalar', leaf: text('long') },
  list: { shape: 'set' },
  address: {
    shape: 'record',
    parts: {
      line1: text('line'),
      line2: text('line'),
      city: text('line'),
      state: text('line'),
      postal_code: text('code'),
      country,
    },
  },
  // One number as text, in E.164, such as `+442079460000`: one form for every number, whoever
  // typed it, so a filter or an integration can rely on it.
  phone: { shape: 'scalar', leaf: text('phone') },
} as const satisfies Record<FieldType, FieldStructure>;

/**
 * The types still in development, each with the Labs flag it is developed behind, as in
 * `number: 'customFieldTypeNumber'`. A site offers such a type only where its flag is on, which is
 * off on every customer's site until Admin and Ghost can both handle the type, so it can be merged
 * and tried out long before it is released. A type with no flag here is released: removing its
 * entry releases it. `docs/how-to/add-a-field-type.md` and `docs/how-to/release-a-field-type.md`
 * cover both steps.
 */
export const FIELD_TYPE_FLAGS: { readonly [T in FieldType]?: string } = {
  phone: 'customFieldTypePhone',
};

/**
 * Whether a field of `type` can be created where `isFlagOn` says which Labs flags are on. Creating
 * a field is the only thing a type's flag holds back. While it is off no field of the type can be
 * created, so reading, editing, exporting and filtering one need no flag of their own, and a field
 * created while the flag was on keeps working if it is switched off again.
 */
export function isCreatableType(type: FieldType, isFlagOn: (flag: string) => boolean): boolean {
  const flag = FIELD_TYPE_FLAGS[type];
  return flag === undefined || isFlagOn(flag);
}

export type StructureOf<T extends FieldType> = (typeof FIELD_STRUCTURES)[T];
export type ShapeOf<T extends FieldType> = StructureOf<T>['shape'];

export type FieldTypeOfShape<S extends FieldShape> = {
  [T in FieldType]: ShapeOf<T> extends S ? T : never;
}[FieldType];

/**
 * The parts a record type declares, or never for another shape. Distributes over `T`, so a union
 * of types gives every part any of them declares.
 */
export type PartsOf<T extends FieldType> = T extends FieldType
  ? StructureOf<T> extends { parts: infer P }
    ? Extract<keyof P, string>
    : never
  : never;

type ValueOfStructure<S extends FieldStructure> = {
  scalar: S extends { leaf: infer L extends Leaf } ? LeafValue<L> : never;
  record: S extends { parts: infer P }
    ? { [K in keyof P]?: P[K] extends Leaf ? LeafValue<P[K]> : never }
    : never;
  set: string[];
}[S['shape']];

/**
 * A value of a type, by its shape: one string for a scalar, a string for any of its declared parts
 * for a record, and the text of each option picked for a set, even when its field takes only one.
 * Every value is laid out this way, so storage, which keeps one string per leaf or option, can
 * always read back what was written.
 */
export type ValueOf<T extends FieldType> = T extends FieldType
  ? ValueOfStructure<StructureOf<T>>
  : never;

type WriteOfStructure<S extends FieldStructure> = {
  scalar: ValueOfStructure<S>;
  record: S extends { parts: infer P }
    ? { [K in keyof P]?: (P[K] extends Leaf ? LeafValue<P[K]> : never) | null }
    : never;
  set: ValueOfStructure<S>;
}[S['shape']];

/**
 * What a write gives a field of a type that still holds a value afterwards; `null` clears the
 * whole field. As in JSON Merge Patch, a record's write names a part as `null` to clear it and
 * leaves out a part to leave it alone, so a write is not a value: a value never holds `null`.
 */
export type WriteOf<T extends FieldType> = T extends FieldType
  ? WriteOfStructure<StructureOf<T>>
  : never;

/**
 * The keys a value has, typed as its type's keys rather than as strings, which is what
 * `Object.keys` gives: a `for...in` over a value of a generic type gives each key as typed.
 */
export function keysOf<R extends object>(value: R): Extract<keyof R, string>[] {
  const keys: Extract<keyof R, string>[] = [];
  for (const key in value) {
    keys.push(key);
  }
  return keys;
}

/**
 * What a field of a set type is set up with: the options it offers, in the order they are shown,
 * and whether a member may pick more than one. An option is named by its text alone, so the same
 * text is the same option whenever it is offered, and nothing else identifies one.
 */
export interface SetSettings {
  readonly options: string[];
  readonly multiple: boolean;
}

/** How many options a set field offers: at least two, or it isn't a choice, and at most a hundred. */
export const MIN_OPTIONS = 2;
export const MAX_OPTIONS = 100;

/**
 * What joins a member's options in one cell when a set is exported, and splits them when one is
 * imported. No option may contain it, so a cell always splits back into what was joined. Chosen
 * because it is rare in names and no spreadsheet splits columns on it by default.
 */
export const OPTION_SEPARATOR = '|';

/**
 * An option's text as it is matched: without surrounding spaces, and with accented letters
 * encoded one way. Neither changes how the text reads, and without them an option pasted from a
 * spreadsheet, or typed on a system that encodes accents differently, would not match one that
 * reads exactly the same. Everything else is kept, case included, so an answer always reads as
 * it was given.
 */
export function optionText(option: string): string {
  return option.trim().normalize('NFC');
}

/**
 * What two options are compared by to tell whether they are the same option: their text as
 * `optionText` tidies it, without regard to case. A list offers each option once, so it can't
 * offer both "Podcasts" and "podcasts". Lower-casing, upper-casing and lower-casing again also
 * matches letters that one change of case keeps apart, such as "ß", "ẞ" and "SS", or a final "ς"
 * and "σ", and does so the same way whatever the locale.
 */
export function optionKey(option: string): string {
  return optionText(option).toLowerCase().toUpperCase().toLowerCase();
}

/** The answers among `held` that a set field offers, in the order it offers them. */
export function inOptionOrder(settings: SetSettings, held: readonly unknown[]): string[] {
  return settings.options.filter((option) => held.includes(option));
}

/**
 * What a form editing a set field's answers starts from: only the options the field offers now,
 * since one it no longer offers can't be picked again. A field that has gone from several answers
 * to one starts unanswered while the member holds several, even if only one of them is still
 * offered, so the next answer replaces them rather than one being shown as their only answer.
 */
export function editableAnswers(settings: SetSettings, held: readonly unknown[]): string[] {
  return !settings.multiple && held.length > 1 ? [] : inOptionOrder(settings, held);
}

/**
 * What a field of each shape is set up with beyond its name: a set's options, and nothing for any
 * other shape.
 */
export interface SettingsOfShape {
  scalar: undefined;
  record: undefined;
  set: SetSettings;
}

export type SettingsOf<T extends FieldType> = T extends FieldType
  ? SettingsOfShape[ShapeOf<T>]
  : never;

/** A field's settings, which a field whose type has nothing to set up doesn't have. */
type SettingsField<S> = [S] extends [undefined]
  ? { readonly settings?: undefined }
  : { readonly settings: S };

/**
 * A field's type together with what the field is set up with. They are one value because only the
 * two together say what the field takes: a list field without its options has no answers to
 * offer, and a short text field has no settings at all.
 */
export type TypedSettings = {
  [T in FieldType]: { readonly type: T } & SettingsField<SettingsOf<T>>;
}[FieldType];

/** The fields among `F` whose type has shape `S`, with their settings narrowed to match. */
export type FieldOfShape<S extends FieldShape, F extends TypedSettings = TypedSettings> = Extract<
  F,
  { type: FieldTypeOfShape<S> }
>;

/**
 * Whether a value names a type this build knows. A site newer than an integration can send a type
 * the integration doesn't know, so check a type from the wire with this first. `constructor` and
 * other names every object has are not types.
 */
export function isFieldType(value: unknown): value is FieldType {
  return FIELD_TYPE_IDS.some((id) => id === value);
}

export type ShapeHandlers<R> = {
  [S in FieldShape]: (
    structure: Extract<FieldStructure, { shape: S }>,
    type: FieldTypeOfShape<S>,
  ) => R;
};

const hasShape =
  <S extends FieldShape>(shape: S) =>
  (type: FieldType): type is FieldTypeOfShape<S> =>
    isFieldType(type) && FIELD_STRUCTURES[type].shape === shape;

const isScalarType = hasShape('scalar');
const isRecordType = hasShape('record');
const isSetType = hasShape('set');

/** Every type of shape `shape`, in catalog order. */
export const typesOfShape = <S extends FieldShape>(shape: S): FieldTypeOfShape<S>[] =>
  FIELD_TYPE_IDS.filter(hasShape(shape));

/**
 * Calls the handler for the shape `type` declares, with the type narrowed to that shape. Throws,
 * naming the type, for one this build doesn't know; check with `isFieldType` first.
 */
export function matchShape<R>(type: FieldType, handlers: ShapeHandlers<R>): R {
  if (isScalarType(type)) {
    return handlers.scalar(FIELD_STRUCTURES[type], type);
  }
  if (isRecordType(type)) {
    return handlers.record(FIELD_STRUCTURES[type], type);
  }
  if (isSetType(type)) {
    return handlers.set(FIELD_STRUCTURES[type], type);
  }
  return unknownType(type);
}

export type FieldHandlers<F extends TypedSettings, R> = {
  [S in FieldShape]: (field: FieldOfShape<S, F>) => R;
};

const fieldHasShape =
  <S extends FieldShape>(shape: S) =>
  <F extends TypedSettings>(field: F): field is FieldOfShape<S, F> =>
    hasShape(shape)(field.type);

const isScalarField = fieldHasShape('scalar');
const isRecordField = fieldHasShape('record');
const isSetField = fieldHasShape('set');

/**
 * Calls the handler for the shape a field's type declares, with the field narrowed to that shape,
 * settings included, for a caller that needs what the field is set up with rather than only its
 * type. Throws, naming the type, for one this build doesn't know.
 */
export function matchField<F extends TypedSettings, R>(field: F, handlers: FieldHandlers<F, R>): R {
  if (isScalarField(field)) {
    return handlers.scalar(field);
  }
  if (isRecordField(field)) {
    return handlers.record(field);
  }
  if (isSetField(field)) {
    return handlers.set(field);
  }
  // A type this build doesn't know, which a plain JavaScript caller can still pass. The guards
  // above can't narrow a generic field to never, so this can't be `unknownType`.
  // oxlint-disable-next-line ghost/ghost-custom/no-native-error
  throw new Error(`Unknown field type: ${String(field.type)}`);
}

/**
 * Every shape has a branch above, so only a type this build doesn't know, which a plain
 * JavaScript caller can still pass, reaches here.
 */
function unknownType(type: never): never {
  // A native error, because this module imports nothing, @tryghost/errors included.
  // oxlint-disable-next-line ghost/ghost-custom/no-native-error
  throw new Error(`Unknown field type: ${String(type)}`);
}

export type LeafHandlers<R> = { [K in LeafKind]: (leaf: Extract<Leaf, { leaf: K }>) => R };

/** Calls the handler for a leaf's kind. */
export function matchLeaf<R>(leaf: Leaf, handlers: LeafHandlers<R>): R {
  switch (leaf.leaf) {
    case 'text':
      return handlers.text(leaf);
    case 'choice':
      return handlers.choice(leaf);
  }
}

/**
 * Whether a value is laid out as a record: an object of parts, which a list is not. What a record
 * must hold is its type's rule to decide.
 */
export function isRecordValue(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * A record type's parts in declaration order, or null for any other type, including one this build
 * doesn't know. Parts are plain strings here; `FIELD_STRUCTURES[type].parts` gives one type's parts
 * with typed keys.
 */
export function partsOf(type: FieldType): string[] | null {
  if (!isFieldType(type)) {
    return null;
  }
  return matchShape<string[] | null>(type, {
    scalar: () => null,
    record: ({ parts }) => Object.keys(parts),
    set: () => null,
  });
}
