import assert from 'node:assert/strict';
import { describe, expectTypeOf, it } from 'vitest';
import {
  FIELD_READING,
  SHAPES,
  accept,
  shaped,
  type FieldShape,
  type ShapeValue,
  type ShapeWrite,
  type ShapedField,
  type TypedSettings,
} from '@tryghost/metafield-types';
import { ALL_FIELD_FIXTURES, type AnyFieldFixture } from '@tryghost/metafield-types/test/fixtures';
import {
  ROOT_PATH,
  VALUE_COLUMNS,
  storedValueAs,
  valueRowsToWrite,
  valuesFromRows,
  type RowsToWrite,
  type ValueRow,
} from '../../../../../core/server/services/members-metafields/storage';

/**
 * What the values service's statements do to a field's rows for a write's changes: a merge
 * deletes the paths it clears, a replace deletes every path it doesn't set, and both upsert the
 * rows they set.
 */
function rowsAfter(rows: readonly ValueRow[], changes: RowsToWrite): ValueRow[] {
  const setPaths = new Set(changes.set.map((row) => row.path));
  const kept = rows.filter(
    (row) =>
      !setPaths.has(row.path) && changes.mode === 'merge' && !changes.cleared.includes(row.path),
  );
  return [...kept, ...changes.set];
}

/** A field's rows after a write the field's rule accepts. */
function written<S extends FieldShape>(
  of: ShapedField<TypedSettings, S>,
  rows: readonly ValueRow[],
  raw: ShapeWrite[S],
): ValueRow[] {
  const acceptance = accept(of, raw);
  assert(acceptance.success, `${of.field.type} refused ${JSON.stringify(raw)}`);
  return rowsAfter(rows, valueRowsToWrite(acceptance.accepted));
}

/** What a field reads as, from its rows, failing on a row outside its layout. */
function read<S extends FieldShape>(of: ShapedField<TypedSettings, S>, rows: readonly ValueRow[]) {
  return storedValueAs(of.field, rows, () => assert.fail('a row was left out'));
}

/** Writing to the rows of any held value reads back as the shape's `apply` says. */
function storageAgrees<S extends FieldShape>(of: ShapedField<TypedSettings, S>, raws: unknown[]) {
  const rules = SHAPES[of.shape];
  const reads = (value: ShapeValue[S] | undefined) =>
    value === undefined ? undefined : FIELD_READING[of.shape].held(of.field, value);
  const values = raws.map(
    (raw) =>
      rules.parse(of.field.type, raw) ??
      assert.fail(`a ${of.field.type} fixture value isn't its shape's structure`),
  );
  // Holding no value at all is where every field starts.
  for (const held of [undefined, ...values]) {
    const heldRows = held === undefined ? [] : written(of, [], held);
    assert.deepEqual(read(of, heldRows), reads(held));

    // Clearing the whole field, the write `null`, deletes its rows in the values service, so
    // only the writes that leave a value are storage's.
    const writes = [
      ...values,
      ...[undefined, ...values].flatMap((next) => {
        const write = rules.diff(held, next);
        return write === undefined || write === null ? [] : [write];
      }),
    ];
    for (const write of writes) {
      assert.deepEqual(
        read(of, written(of, heldRows, write)),
        reads(rules.apply(held, write)),
        JSON.stringify({ held, write }),
      );
    }
  }
}

// The row layouts are pure, so a law over them is checked here, for every type the catalog has.
// That a value survives a round trip through the database itself is proven in the members
// custom-fields API tests.
describe('custom field value storage', function () {
  describe.each(
    ALL_FIELD_FIXTURES.map((fixture): [string, AnyFieldFixture] => [fixture.field.type, fixture]),
  )('a %s field', function (_type, { field, values }) {
    it('reads back what any write to any held value leaves, as its shape says', function () {
      storageAgrees(shaped(field), [...values]);
    });
  });

  // schema.js is JavaScript the compiler can't see into, so the values table is checked against
  // the columns storage writes: one per kind of value, and a row holding its value in exactly one.
  it('has the values table keep a column for each kind of value, holding exactly one per row', function () {
    const table = require('../../../../../core/server/data/schema/schema').members_metafield_values;
    const declared = Object.keys(table).filter((column) => column.startsWith('value_'));
    assert.deepEqual([...declared].sort(), [...VALUE_COLUMNS].sort());
    for (const column of VALUE_COLUMNS) {
      assert.equal(table[column].nullable, true, column);
    }
    assert.deepEqual(table['@@CHECKS@@'], [{ exactlyOneOf: [...VALUE_COLUMNS] }]);
  });

  // Checked by `test:types` only: each line fails it once the compiler allows what it describes.
  describe('what the compiler refuses', function () {
    it('writes only a value a rule accepted', function () {
      type Writable = Parameters<typeof valueRowsToWrite>[0];
      expectTypeOf<{ shape: 'scalar'; value: 'Bex' }>().not.toExtend<Writable>();
    });
  });

  describe('rows become every member’s values', function () {
    const byPath = (_row: unknown, rows: readonly ValueRow[]) =>
      Object.fromEntries(rows.map(({ path, value_text: value }) => [path, value]));

    it('gathers each value from every row belonging to it', function () {
      const row = (
        memberId: string,
        namespace: string,
        key: string,
        path: string,
        value: string,
      ) => ({
        member_id: memberId,
        namespace,
        key,
        path,
        value_text: value,
      });
      const values = valuesFromRows(
        [
          row('m1', 'custom', 'home_address', 'city', 'London'),
          row('m1', 'custom', 'nickname', ROOT_PATH, 'Bex'),
          row('m2', 'custom', 'home_address', 'country', 'IE'),
          row('m1', 'custom', 'home_address', 'line1', '1 High St'),
          row('m1', 'transistor', 'nickname', ROOT_PATH, 'Becks'),
        ],
        byPath,
      );

      // m1's address arrives split by two unrelated rows; nothing depends on the
      // rows for one value being next to each other. Two namespaces can each hold a
      // `nickname` without one overwriting the other.
      assert.deepEqual(values.get('m1'), {
        custom: {
          home_address: { city: 'London', line1: '1 High St' },
          nickname: { [ROOT_PATH]: 'Bex' },
        },
        transistor: { nickname: { [ROOT_PATH]: 'Becks' } },
      });
      assert.deepEqual(values.get('m2'), { custom: { home_address: { country: 'IE' } } });
    });

    it('leaves out a namespace whose fields all read as nothing, and a member left with none', function () {
      const row = (memberId: string, namespace: string, key: string) => ({
        member_id: memberId,
        namespace,
        key,
        path: ROOT_PATH,
        value_text: 'x',
      });
      const values = valuesFromRows(
        [
          row('m1', 'custom', 'unreadable'),
          row('m1', 'transistor', 'nickname'),
          row('m2', 'custom', 'unreadable'),
        ],
        ({ key }, rows) => (key === 'unreadable' ? undefined : rows[0]?.value_text),
      );

      assert.deepEqual(values.get('m1'), { transistor: { nickname: 'x' } });
      assert.equal(values.has('m2'), false);
    });

    it('leaves a member with no rows out entirely', function () {
      assert.deepEqual([...valuesFromRows([], byPath).keys()], []);
    });
  });
});
