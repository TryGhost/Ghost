/**
 * The rules every field of a shape follows, whatever its type and settings, and the rules a field
 * adds from its settings when a held value is read.
 *
 * A shape's rules look only at structure: they know a list is a list of strings, but not which
 * strings a field offers. They also say what a write does to a held value, which is part of the
 * API's contract rather than storage's choice: a client works out a write against the value its
 * form loaded, and Ghost applies it to whatever is stored when it lands, which another writer may
 * have changed in between. The two only agree because both read the rules here.
 *
 * Each table is keyed by shape, so a shape added to the catalog fails to compile here until it has
 * an entry. Each translator of a shape into another domain's terms, such as the storage translator
 * into rows or the CSV translator into cells, keeps its own table of the same form, which `shaped`
 * lets it index without a cast.
 *
 * Zod-free, like `./structure`, so Portal can use it. The strict rule a write must meet is built
 * from zod and lives in `./index` as `accept`.
 */
import {
  FIELD_STRUCTURES,
  editableAnswers,
  isRecordValue,
  matchField,
  matchShape,
  type FieldOfShape,
  type FieldShape,
  type FieldType,
  type FieldTypeOfShape,
  type Leaf,
  type LeafKind,
  type LeafValues,
  type TypedSettings,
  type ValueOf,
  type WriteOf,
  keysOf,
} from './structure.js';

/** A leaf's value of any kind. */
export type AnyLeafValue = LeafValues[LeafKind];

/**
 * What a value of each JSON kind is. Primitives only: the shape rules compare two leaf values with
 * `===`, which a kind holding objects would break.
 */
interface KindValues {
  string: string;
  number: number;
  boolean: boolean;
}

/** The JSON kind a value comes in. */
type KindOf<V> = { [K in keyof KindValues]: V extends KindValues[K] ? K : never }[keyof KindValues];

/**
 * The JSON kinds the catalog's leaves' values come in, which is all that tells two leaves' values
 * apart without their field: how storage picks a value's column, and a filter what to compare it
 * in. Read from the leaves, so a leaf kind whose value is a new JSON kind widens it.
 */
export type ValueKind = KindOf<AnyLeafValue>;

/** The leaf values of one JSON kind. */
export type ValueOfKind<K extends ValueKind> = Extract<AnyLeafValue, KindValues[K]>;

/**
 * What the domain knows about each kind of leaf beyond its rule, which needs zod and is
 * `LEAF_RULES` in `./index`. Keyed by kind, so a kind added to the catalog fails to compile here
 * until it says each.
 */
interface LeafKindRules<K extends LeafKind> {
  /** The JSON kind its value comes in. */
  readonly kind: KindOf<LeafValues[K]>;
  /** A raw value read as this leaf's value, or undefined when it holds none. */
  read(raw: unknown): LeafValues[K] | undefined;
  /**
   * Text, as a form's input or a CSV cell holds it, read as this leaf's value, or the text itself
   * where it holds none, so the leaf's rule refuses it rather than it being dropped. Writing a
   * value as text is `String` for every kind.
   */
  fromText(text: string): LeafValues[K] | string;
  /**
   * How two of its values order, as a filter comparing by more or less must, or null for a kind
   * no filter compares that way.
   */
  readonly order: ((a: LeafValues[K], b: LeafValues[K]) => number) | null;
}

/**
 * What a value of each shape holds: whatever a type of that shape holds, read from the catalog, so a
 * type's parts and leaves are typed the same way here. A value always holds something: a field
 * holding nothing has no value at all, rather than an empty one, so `0` and an answer left blank are
 * never confused. A record holds at least one part, and a set at least one option.
 */
export type ShapeValue = { [S in FieldShape]: ValueOf<FieldTypeOfShape<S>> };

/** What a write to a field of each shape gives, from the catalog in the same way; see `WriteOf`. */
export type ShapeWrite = { [S in FieldShape]: WriteOf<FieldTypeOfShape<S>> };

export interface ShapeRules<S extends FieldShape> {
  /**
   * What `raw` holds as a value of `type`, or undefined when it holds nothing of it. Lenient: a part
   * the type doesn't declare, or one of another kind than its leaf, is left out.
   */
  parse(type: FieldTypeOfShape<S>, raw: unknown): ShapeValue[S] | undefined;
  /** Whether two values hold the same, which a write that changes nothing leaves alone. */
  same(a: ShapeValue[S], b: ShapeValue[S]): boolean;
  /** What a write does to what is held, which is nothing when a record's write clears every part. */
  apply(held: ShapeValue[S] | undefined, write: ShapeWrite[S]): ShapeValue[S] | undefined;
  /**
   * The smallest write that turns `held` into `next`: `null` when `next` holds nothing, and
   * undefined when the two hold the same.
   */
  diff(
    held: ShapeValue[S] | undefined,
    next: ShapeValue[S] | undefined,
  ): ShapeWrite[S] | null | undefined;
}

/**
 * A leaf's value, or undefined for text of nothing but spaces, which holds nothing: a form's input
 * or a CSV cell left blank says no more than one left out.
 */
const filled = <V extends AnyLeafValue>(raw: V | undefined): V | undefined =>
  typeof raw === 'string' && raw.trim() === '' ? undefined : raw;

/**
 * A value JSON carries as a string, without its padding, which every such leaf's rule trims too.
 * Unordered: no filter compares text by more or less.
 */
const stringRules = {
  kind: 'string',
  read: (raw: unknown) => (typeof raw === 'string' ? filled(raw.trim()) : undefined),
  fromText: (text: string) => text.trim(),
  order: null,
} as const;

export const LEAVES: { readonly [K in LeafKind]: LeafKindRules<K> } = {
  text: stringRules,
  choice: stringRules,
  number: {
    kind: 'number',
    read: (raw) => (typeof raw === 'number' && Number.isFinite(raw) ? raw : undefined),
    // Plain decimal notation only, so `0x10` or `1e3` are refused rather than read as other numbers.
    fromText: (text) => (/^-?\d+(\.\d+)?$/.test(text.trim()) ? Number(text.trim()) : text),
    order: (a, b) => a - b,
  },
};

/** A raw value read as its leaf's kind of value, typed by the leaf. */
const readLeaf = <K extends LeafKind>(leaf: { readonly leaf: K }, raw: unknown) =>
  LEAVES[leaf.leaf].read(raw);

/** A raw value read as a value of any kind of leaf, or undefined when no kind reads it. */
function readAnyLeaf(raw: unknown): AnyLeafValue | undefined {
  for (const kind of keysOf(LEAVES)) {
    const value = LEAVES[kind].read(raw);
    if (value !== undefined) {
      return value;
    }
  }
  return undefined;
}

/** A value being built a key at a time, before it is handed on as the readonly value it is. */
type Building<R> = { -readonly [K in keyof R]: R[K] };

const isTextList = (raw: unknown): raw is string[] =>
  Array.isArray(raw) && raw.every((entry) => typeof entry === 'string');

/**
 * The diff of a shape whose write replaces what is held, from how it compares two values that both
 * hold something: a value going is the write `null`, and a value arriving is the whole value.
 */
const diffing =
  <V, W>(change: (held: V, next: V) => W | undefined) =>
  (held: V | undefined, next: V | undefined): V | W | null | undefined => {
    if (next === undefined) {
      return held === undefined ? undefined : null;
    }
    return held === undefined ? next : change(held, next);
  };

/** A record's parts that hold something, or undefined when none does: cleared parts are left out. */
const someParts = (parts: ShapeWrite['record']): ShapeValue['record'] | undefined => {
  const held: Building<ShapeValue['record']> = {};
  for (const part of keysOf(parts)) {
    const value = filled(parts[part] ?? undefined);
    if (value !== undefined) {
      held[part] = value;
    }
  }
  return keysOf(held).length > 0 ? held : undefined;
};

/** A set's options, or undefined when it has none. */
const someOptions = (options: ShapeValue['set']): ShapeValue['set'] | undefined =>
  options.length > 0 ? options : undefined;

const scalar: ShapeRules<'scalar'> = {
  // Any leaf's value rather than only its own leaf's, so text that holds no value of the leaf is
  // kept for the leaf's rule to refuse; its type decides which kind it must be.
  parse: (_type, raw) => readAnyLeaf(raw),
  same: (a, b) => a === b,
  apply: (_held, write) => write,
  diff: diffing((held, next) => (held === next ? undefined : next)),
};

const record: ShapeRules<'record'> = {
  // Only the parts the type declares, each read as its leaf's kind of value.
  parse: (type, raw) => {
    if (!isRecordValue(raw)) {
      return undefined;
    }
    const parts = FIELD_STRUCTURES[type].parts;
    const value: Building<ShapeValue['record']> = {};
    for (const part of keysOf(parts)) {
      const held = readLeaf(parts[part], raw[part]);
      if (held !== undefined) {
        value[part] = held;
      }
    }
    return keysOf(value).length > 0 ? value : undefined;
  },
  same: (a, b) => record.diff(a, b) === undefined,
  // Merged, as JSON Merge Patch merges objects: a part the write names is set, `null` clears it,
  // and a part it leaves out is left alone, so writes to different parts don't overwrite each
  // other.
  apply: (held, write) => {
    const merged: Building<ShapeWrite['record']> = { ...held };
    for (const part of keysOf(write)) {
      const value = write[part];
      if (value !== undefined) {
        merged[part] = value;
      }
    }
    return someParts(merged);
  },
  // Never `null`, even when nothing is left: a merged write names only the parts its writer saw, so
  // a writer clearing the city doesn't also clear a country someone else has just set.
  diff: (held, next) => {
    if (held === undefined) {
      return next;
    }
    const now: ShapeValue['record'] = next ?? {};
    const write: Building<ShapeWrite['record']> = {};
    for (const part of keysOf({ ...held, ...now })) {
      if (held[part] !== now[part]) {
        write[part] = now[part] ?? null;
      }
    }
    return keysOf(write).length > 0 ? write : undefined;
  },
};

const set: ShapeRules<'set'> = {
  parse: (_type, raw) => (isTextList(raw) ? someOptions(raw) : undefined),
  same: (a, b) => {
    const options = new Set(b);
    return new Set(a).size === options.size && a.every((option) => options.has(option));
  },
  // Replaced, as JSON Merge Patch replaces arrays: a write states the whole answer.
  apply: (_held, write) => write,
  diff: diffing((held, next) => (set.same(held, next) ? undefined : next)),
};

/** Each shape's rules. A shape added to the catalog without rules doesn't compile. */
export const SHAPES: { readonly [S in FieldShape]: ShapeRules<S> } = { scalar, record, set };

/**
 * A field together with its shape, as one of a union with a member per shape. Indexing a table
 * keyed by shape with `shape` gives the entry for the same shape that `field` has, so a translator
 * such as the storage translator can call its entry for a field without a cast or a branch per
 * shape.
 */
export type ShapedField<
  F extends TypedSettings = TypedSettings,
  S extends FieldShape = FieldShape,
> = {
  [K in S]: { readonly shape: K; readonly field: FieldOfShape<K, F> };
}[S];

/** A field paired with its shape: the one place a field's union is branched on by shape. */
export function shaped<F extends TypedSettings>(field: F): ShapedField<F> {
  return matchField<F, ShapedField<F>>(field, {
    scalar: (of) => ({ shape: 'scalar', field: of }),
    record: (of) => ({ shape: 'record', field: of }),
    set: (of) => ({ shape: 'set', field: of }),
  });
}

/**
 * A type together with its shape, for a translator that knows a field's type but not its settings,
 * as the CSV translator does.
 */
export type ShapedType<S extends FieldShape = FieldShape> = {
  [K in S]: { readonly shape: K; readonly type: FieldTypeOfShape<K> };
}[S];

/** A type paired with its shape. */
export function shapedType(type: FieldType): ShapedType {
  return matchShape<ShapedType>(type, {
    scalar: (_structure, of) => ({ shape: 'scalar', type: of }),
    record: (_structure, of) => ({ shape: 'record', type: of }),
    set: (_structure, of) => ({ shape: 'set', type: of }),
  });
}

/** How a field of each shape reads a held value, using its type and settings. */
export interface FieldReading<S extends FieldShape> {
  /**
   * Lenient: what a field holds, read as the field gives it meaning. Keeps answers to options
   * since removed, and parts saved under an older, looser rule, so tightening a rule never hides
   * what members hold. Puts a list's answers in the field's order, then the removed ones.
   */
  held(field: FieldOfShape<S>, value: ShapeValue[S]): ShapeValue[S] | undefined;
  /**
   * What a form can show of a held value. A save that writes what the form shows drops an answer
   * the form can't show.
   */
  editable(field: FieldOfShape<S>, held: ShapeValue[S]): ShapeValue[S] | undefined;
}

/** A form shows everything the field holds: true of every shape but a set. */
const showsWhatItHolds = <S extends FieldShape>(): Pick<FieldReading<S>, 'editable'> => ({
  editable: (_field, held) => held,
});

export const FIELD_READING: { readonly [S in FieldShape]: FieldReading<S> } = {
  scalar: { held: (_field, value) => value, ...showsWhatItHolds<'scalar'>() },
  // Parsing already kept only the parts the type declares, which are all a client can draw.
  record: { held: (_field, value) => value, ...showsWhatItHolds<'record'>() },
  set: {
    held: ({ settings }, value) => {
      const rank = (text: string) => {
        const index = settings.options.indexOf(text);
        return index === -1 ? settings.options.length : index;
      };
      return [...value].sort((a, b) => rank(a) - rank(b) || (a < b ? -1 : a > b ? 1 : 0));
    },
    editable: ({ settings }, held) => someOptions(editableAnswers(settings, held)),
  },
};

/**
 * What a held raw value reads as for its field: its structure checked, then read as the field
 * gives it meaning. Undefined when the value isn't the field's structure.
 */
export function heldValue<S extends FieldShape>(
  { shape, field }: ShapedField<TypedSettings, S>,
  raw: unknown,
): ShapeValue[S] | undefined {
  const value = SHAPES[shape].parse(field.type, raw);
  return value === undefined ? undefined : FIELD_READING[shape].held(field, value);
}

/** What a form can show of a held raw value, or undefined when it shows nothing. */
export function editableValue<S extends FieldShape>(
  of: ShapedField<TypedSettings, S>,
  raw: unknown,
): ShapeValue[S] | undefined {
  const held = heldValue(of, raw);
  return held === undefined ? undefined : FIELD_READING[of.shape].editable(of.field, held);
}

/** A leaf's value as text gives it, or undefined for blank text, which holds nothing. */
export const leafFromText = (leaf: Leaf, text: string): AnyLeafValue | undefined => {
  const value = filled(text);
  return value === undefined ? undefined : LEAVES[leaf.leaf].fromText(text);
};

/**
 * How a value of each shape given as text, such as a form's inputs or a row's cells, has each leaf
 * read from its text, before the shape parses it. Anything that isn't text is left as it is.
 */
interface TextDecoding<S extends FieldShape> {
  fromText(type: FieldTypeOfShape<S>, raw: unknown): unknown;
}

/** A leaf read from its text, where it is text; blank text is kept, for parsing to drop. */
const leafOf = (leaf: Leaf, raw: unknown): unknown =>
  typeof raw === 'string' ? (leafFromText(leaf, raw) ?? raw) : raw;

const SHAPE_TEXT: { readonly [S in FieldShape]: TextDecoding<S> } = {
  scalar: { fromText: (type, raw) => leafOf(FIELD_STRUCTURES[type].leaf, raw) },
  record: {
    fromText: (type, raw) => {
      if (!isRecordValue(raw)) {
        return raw;
      }
      const leaves: Readonly<Record<string, Leaf | undefined>> = FIELD_STRUCTURES[type].parts;
      return Object.fromEntries(
        Object.entries(raw).map(([part, held]) => {
          const leaf = Object.prototype.hasOwnProperty.call(leaves, part)
            ? leaves[part]
            : undefined;
          return [part, leaf ? leafOf(leaf, held) : held];
        }),
      );
    },
  },
  set: { fromText: (_type, raw) => raw },
};

/**
 * What a value given as text holds, such as a form's inputs or a row's cells: each leaf read from
 * its text, then parsed as a value of its type, which drops blank text. Undefined when it holds
 * nothing.
 */
export function valueFromText<S extends FieldShape>(
  { shape, type }: ShapedType<S>,
  raw: unknown,
): ShapeValue[S] | undefined {
  return SHAPES[shape].parse(type, SHAPE_TEXT[shape].fromText(type, raw));
}

/** A value of each shape as a form's inputs hold it: each leaf as its text. */
export interface ShapeText {
  scalar: string;
  record: { readonly [part: string]: string };
  set: string[];
}

/** How a value of each shape is held by a form's inputs, each leaf as `String` writes it. */
const VALUE_TEXT: { readonly [S in FieldShape]: (value: ShapeValue[S]) => ShapeText[S] } = {
  scalar: (value) => String(value),
  record: (value) =>
    Object.fromEntries(
      keysOf(value).flatMap((part) => {
        const held = value[part];
        return held === undefined ? [] : [[part, String(held)]];
      }),
    ),
  set: (value) => value,
};

/** A value as a form's inputs hold it, which `valueFromText` reads back as the same value. */
export function textOfValue<S extends FieldShape>(shape: S, value: ShapeValue[S]): ShapeText[S] {
  return VALUE_TEXT[shape](value);
}

/** What a field holds, each leaf as its text, as a field shown but not edited draws it. */
export function heldTextOf<S extends FieldShape>(
  of: ShapedField<TypedSettings, S>,
  held: unknown,
): ShapeText[S] | undefined {
  const value = heldValue(of, held);
  return value === undefined ? undefined : textOfValue(of.shape, value);
}

/**
 * What a form's inputs start from for a held raw value: what the form can show of it, each leaf as
 * its text, or undefined when it shows nothing.
 */
export function formTextOf<S extends FieldShape>(
  of: ShapedField<TypedSettings, S>,
  held: unknown,
): ShapeText[S] | undefined {
  const value = editableValue(of, held);
  return value === undefined ? undefined : textOfValue(of.shape, value);
}

/**
 * What a form's inputs show, read as the field reads a value: each leaf from its text, blank text
 * holding nothing, and only what the form can show. Undefined when they show nothing.
 */
export function formShows<S extends FieldShape>(
  of: ShapedField<TypedSettings, S>,
  inputs: unknown,
): ShapeValue[S] | undefined {
  const typed = valueFromText({ shape: of.shape, type: of.field.type }, inputs);
  return typed === undefined ? undefined : editableValue(of, typed);
}

/**
 * The write that turns what a field holds into what a form's inputs show: `null` when the inputs
 * show nothing of a replacing shape, and undefined when they show what the field holds. The held
 * value is read as the field reads it first, so a part the form doesn't draw is never written, and
 * an answer the form can't show, such as one to an option the field no longer offers, is cleared
 * by the write.
 */
export function formWrite<S extends FieldShape>(
  of: ShapedField<TypedSettings, S>,
  inputs: unknown,
  held: unknown,
): ShapeWrite[S] | null | undefined {
  return SHAPES[of.shape].diff(heldValue(of, held), formShows(of, inputs));
}
