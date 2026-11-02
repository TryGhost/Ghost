/**
 * What a field type is made of, with no opinion on what a valid value looks like.
 *
 * Every type is composed from a few building blocks. A leaf is one value: text of a size, or a
 * choice from a list. A type is a leaf on its own, or a record of named leaves. Everything that
 * stores, exports, edits, filters or draws a value is written once per building block, so a type
 * composed from existing blocks needs nothing beyond its entry here.
 *
 * This half is separate from `./index` because that half is built out of zod, and zod is
 * sixty-odd kilobytes. Ghost's server enforces the rules and can afford them; Portal only draws
 * the inputs, and it loads on every page view of every themed site.
 */

/** How much text a text leaf holds. Each size has its bound, and its message, in `./index`. */
export const TEXT_SIZES = ['line', 'code', 'long'] as const;
export type TextSize = (typeof TEXT_SIZES)[number];

/** The lists a choice can pick from. Each list says which keys it accepts in `./index`. */
export const LIST_SOURCES = ['countries'] as const;
export type ListSource = (typeof LIST_SOURCES)[number];

export interface TextLeaf {
  readonly leaf: 'text';
  readonly size: TextSize;
}

export interface ChoiceLeaf {
  readonly leaf: 'choice';
  readonly from: ListSource;
}

/** One value, stored as one string. */
export type Leaf = TextLeaf | ChoiceLeaf;
export type LeafKind = Leaf['leaf'];

export const text = <const S extends TextSize>(size: S) => ({ leaf: 'text', size }) as const;
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

export type FieldStructure = ScalarStructure | RecordStructure;
export type FieldShape = FieldStructure['shape'];

/** The source for the union type, the zod enum and the `FIELD_STRUCTURES` keys alike. */
export const FIELD_TYPE_IDS = ['short_text', 'long_text', 'address'] as const;
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
} as const satisfies Record<FieldType, FieldStructure>;

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
  scalar: string;
  record: S extends { parts: infer P } ? { [K in keyof P]?: string } : never;
}[S['shape']];

/**
 * A value of a type, by its shape: one string for a scalar, and a string for any of its declared
 * parts for a record. Every value is laid out this way, so storage, which keeps one string per
 * leaf, can always read back what was written.
 */
export type ValueOf<T extends FieldType> = T extends FieldType
  ? ValueOfStructure<StructureOf<T>>
  : never;

/** What a field of each shape is set up with beyond its name. No shape has anything yet. */
interface SettingsOfShape {
  scalar: null;
  record: null;
}

export type SettingsOf<T extends FieldType> = T extends FieldType
  ? SettingsOfShape[ShapeOf<T>]
  : never;

/**
 * A field's type together with what the field is set up with. They are one value because only the
 * two together say what the field takes: a list field without its options has no answers to
 * offer, and a short text field has no options to carry.
 */
export type TypedSettings = {
  [T in FieldType]: { readonly type: T; readonly settings: SettingsOf<T> };
}[FieldType];

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
  return unknownType(type);
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
  });
}
