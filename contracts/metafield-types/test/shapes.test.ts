import { assert, describe, expect, it } from 'vitest';
import {
  FIELD_READING,
  SHAPES,
  shaped,
  LEAVES,
  formShows,
  formTextOf,
  formWrite,
  heldTextOf,
  keysOf,
  matchShape,
  type Leaf,
  type LeafKind,
  shapedType,
  textOfValue,
  valueFromText,
  type FieldShape,
  type ShapeValue,
  type ShapedField,
  type TypedSettings,
} from '../src/index.js';
import { ALL_FIELD_FIXTURES, type AnyFieldFixture } from './fixtures/fields.ts';

/** A fixture's values in its shape's structure. */
function valuesOf<S extends FieldShape>(
  { shape, field }: ShapedField<TypedSettings, S>,
  raws: readonly unknown[],
): ShapeValue[S][] {
  return raws.map(
    (raw) =>
      SHAPES[shape].parse(field.type, raw) ??
      assert.fail(`A ${field.type} fixture value isn't its shape's structure`),
  );
}

function diffRebuilds<S extends FieldShape>(of: ShapedField<TypedSettings, S>, raws: unknown[]) {
  const rules = SHAPES[of.shape];
  // No value at all is one of the values a field can go from or to.
  const values = [undefined, ...valuesOf(of, raws)];
  const agree = (a: ShapeValue[S] | undefined, b: ShapeValue[S] | undefined) =>
    a === undefined || b === undefined ? a === b : rules.same(a, b);
  for (const held of values) {
    for (const next of values) {
      const write = rules.diff(held, next);
      const after =
        write === undefined ? held : write === null ? undefined : rules.apply(held, write);
      expect(agree(after, next), JSON.stringify({ held, next, write, after })).toBe(true);
    }
  }
}

function readsBackAsHeld<S extends FieldShape>(of: ShapedField<TypedSettings, S>, raws: unknown[]) {
  for (const value of valuesOf(of, raws)) {
    expect(FIELD_READING[of.shape].held(of.field, value)).toEqual(value);
  }
}

function formReadsBack<S extends FieldShape>(of: ShapedField<TypedSettings, S>, raws: unknown[]) {
  for (const value of valuesOf(of, raws)) {
    const text = textOfValue(of.shape, value);
    expect(formShows(of, text), JSON.stringify(text)).toEqual(value);
    expect(formWrite(of, text, value), JSON.stringify(text)).toBeUndefined();
  }
}

describe.each(
  ALL_FIELD_FIXTURES.map((fixture): [string, AnyFieldFixture] => [fixture.field.type, fixture]),
)('the shape of a %s field', (_type, { field, values }) => {
  // A form holds each leaf as text, so what it shows has to read back as what it was given.
  it('reads a value back from the text a form holds it as, and an untouched form writes nothing', function () {
    formReadsBack(shaped(field), [...values]);
  });

  it('rebuilds any value from any other with the write their diff gives', function () {
    diffRebuilds(shaped(field), [...values]);
  });

  it('reads each value back as it is', function () {
    readsBackAsHeld(shaped(field), [...values]);
  });
});

describe('a record', function () {
  // A writer knows only the parts it saw, so clearing everything it saw clears those parts, and a
  // part someone else set in the meantime survives.
  it('clears what it held part by part, never the whole field', function () {
    expect(SHAPES.record.diff({ city: 'Berlin' }, undefined)).toEqual({ city: null });
  });

  const parts = ['line1', 'city', 'country'];
  const held = [
    undefined,
    { line1: '1 High St', city: 'London' },
    { city: 'Dublin', country: 'IE' },
  ];

  it('gives the same value whichever order two writes to different parts land in', function () {
    for (const value of held) {
      for (const first of parts) {
        for (const second of parts.filter((part) => part !== first)) {
          for (const [one, two] of [
            ['one', 'two'],
            [null, 'two'],
            ['one', null],
          ]) {
            const a = { [first]: one };
            const b = { [second]: two };
            expect(SHAPES.record.apply(SHAPES.record.apply(value, a), b)).toEqual(
              SHAPES.record.apply(SHAPES.record.apply(value, b), a),
            );
          }
        }
      }
    }
  });
});

describe('a set', function () {
  it('holds the same answer whatever order its options come in', function () {
    expect(SHAPES.set.same(['Film', 'Travel'], ['Travel', 'Film'])).toBe(true);
    expect(SHAPES.set.diff(['Film', 'Travel'], ['Travel', 'Film'])).toBeUndefined();
    expect(SHAPES.set.same(['Film', 'Film'], ['Film'])).toBe(true);
    expect(SHAPES.set.same(['Film'], ['Film', 'Travel'])).toBe(false);
  });
});

describe('a value given as text', function () {
  it('holds nothing when every part of it is blank', function () {
    expect(valueFromText(shapedType('short_text'), '  ')).toBeUndefined();
    expect(valueFromText(shapedType('address'), { line1: '', city: ' ' })).toBeUndefined();
    expect(valueFromText(shapedType('list'), [])).toBeUndefined();
  });

  it("holds nothing when it isn't laid out as its shape", function () {
    expect(valueFromText(shapedType('address'), '1 High St')).toBeUndefined();
    expect(SHAPES.record.parse('address', ['1 High St'])).toBeUndefined();
  });
});

describe('a list held as text', function () {
  const field = shaped({ type: 'list', settings: { options: ['Dog', 'Cat'], multiple: true } });
  const held = ['Dog', 'Hamster'];

  it('shows every answer where it is only seen, and only the offered ones where it is edited', function () {
    expect(heldTextOf(field, held)).toEqual(['Dog', 'Hamster']);
    expect(formTextOf(field, held)).toEqual(['Dog']);
  });

  it('shows nothing of a value that holds nothing', function () {
    expect(heldTextOf(field, undefined)).toBeUndefined();
    expect(formTextOf(field, ['Hamster'])).toBeUndefined();
  });
});

// The fixtures are the registry every surface's tests run over, so between them they must reach
// every building block: a shape or a kind of leaf no fixture uses is one no surface is tested with.
describe('the fixtures', function () {
  const blocksOf = ({ field }: AnyFieldFixture) =>
    matchShape<{ shape: FieldShape; leaves: LeafKind[] }>(field.type, {
      scalar: ({ leaf }) => ({ shape: 'scalar', leaves: [leaf.leaf] }),
      record: ({ parts }) => ({
        shape: 'record',
        leaves: Object.values<Leaf>(parts).map(({ leaf }) => leaf),
      }),
      set: () => ({ shape: 'set', leaves: [] }),
    });
  const used = ALL_FIELD_FIXTURES.map(blocksOf);

  it('use every shape', function () {
    expect(new Set(used.map(({ shape }) => shape))).toEqual(new Set(keysOf(SHAPES)));
  });

  it('use every kind of leaf', function () {
    expect(new Set(used.flatMap(({ leaves }) => leaves))).toEqual(new Set(keysOf(LEAVES)));
  });
});
