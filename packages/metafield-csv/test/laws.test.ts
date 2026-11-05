import assert from 'node:assert/strict';
import { describe, it } from 'vitest';
import { CUSTOM_NAMESPACE, KeySchema } from '@tryghost/metafield-types/identity';
import { ALL_FIELD_FIXTURES, type AnyFieldFixture } from '@tryghost/metafield-types/test/fixtures';
import { csvCellsForFields, fieldValuesFromCsvRow, type CsvField } from '../src/index.ts';

// A law over CSV's table, run for every type the catalog has: a value exported to a row's cells
// imports back as the same value, and a field without one imports as nothing.
describe.each(
  ALL_FIELD_FIXTURES.map((fixture): [string, AnyFieldFixture] => [fixture.field.type, fixture]),
)('a %s field in CSV', function (_type, { field, values }) {
  const csvField: CsvField = {
    namespace: CUSTOM_NAMESPACE,
    key: KeySchema.parse('sampled'),
    type: field.type,
  };
  const roundTrip = (value: unknown) =>
    fieldValuesFromCsvRow(
      [csvField],
      csvCellsForFields([csvField], { [CUSTOM_NAMESPACE]: { sampled: value } }),
    );

  it('imports what it exports', function () {
    for (const value of values) {
      assert.deepEqual(Object.values(roundTrip(value)), [value]);
    }
  });

  it('imports nothing for a field it exported without a value', function () {
    assert.deepEqual(roundTrip(undefined), {});
  });
});
