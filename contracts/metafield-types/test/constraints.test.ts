import { describe, expectTypeOf, it } from 'vitest';
import {
  accept,
  shaped,
  type Accepted,
  type AcceptedValue,
  type FieldValue,
  type FieldWrite,
  type ShapeValue,
  type ShapeWrite,
  type ShapedField,
  type FieldTypeOfShape,
  type ValueOf,
} from '../src/index.js';

// What the compiler must keep refusing, which the code relies on it to: each line fails
// `test:types` once the compiler starts allowing what it describes. They check types only, so
// they do nothing when the tests run.
describe('what the compiler refuses', function () {
  it('pairs a field only with its own shape', function () {
    expectTypeOf<{ shape: 'scalar'; field: { type: 'short_text' } }>().toExtend<ShapedField>();
    expectTypeOf<{ shape: 'set'; field: { type: 'short_text' } }>().not.toExtend<ShapedField>();
  });

  it('stores only a value a rule accepted, with the shape it was accepted for', function () {
    expectTypeOf<string>().not.toExtend<Accepted<'scalar'>>();
    expectTypeOf<{ shape: 'set'; value: Accepted<'scalar'> }>().not.toExtend<AcceptedValue>();

    const acceptance = accept(shaped({ type: 'short_text' }), 'Ghost');
    // @ts-expect-error -- an acceptance may have refused the value, so it isn't one until checked
    expectTypeOf(acceptance.accepted).toExtend<AcceptedValue>();
  });

  it('keeps a cleared part out of a value, which never holds one', function () {
    expectTypeOf<{ line1: null }>().not.toExtend<ShapeValue['record']>();
    expectTypeOf<{ line1: null }>().not.toExtend<FieldValue>();
  });

  // A write may clear a part, which a value never does, so code holding a write can't hand it on
  // as a value.
  it('keeps a write apart from a value', function () {
    expectTypeOf<ShapeWrite['record']>().not.toExtend<ShapeValue['record']>();
    expectTypeOf<ShapeWrite['record']>().not.toExtend<FieldValue>();
    expectTypeOf<FieldWrite>().not.toExtend<FieldValue>();
    expectTypeOf<ShapeValue['record']>().toExtend<ShapeWrite['record']>();
  });

  // Each shape's value is what its types hold, read from the catalog, so the two can't disagree.
  it("types a shape's value as the catalog types its types' values", function () {
    expectTypeOf<ShapeValue['record']>().toEqualTypeOf<ValueOf<'address'>>();
    expectTypeOf<ShapeValue['scalar']>().toEqualTypeOf<ValueOf<FieldTypeOfShape<'scalar'>>>();
    expectTypeOf<{ line1: 42 }>().not.toExtend<ShapeValue['record']>();
  });
});
