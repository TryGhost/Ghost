import assert from 'node:assert/strict';
import { describe, it } from 'vitest';
import {
  csvCellsForFields,
  csvColumnsForField,
  fieldValuesFromCsvRow,
  isAnyFieldColumn,
  isFieldColumn,
} from '../src/csv.ts';

// The behavioural outcomes — an export carrying the right columns, an exported
// file re-importing without remapping — are proven end-to-end through the member
// export and import HTTP API integration tests. What is asserted here is the one
// invariant those tests can only observe indirectly: the key set is fixed by the
// field definitions alone, never by which values a given member happens to hold.
// Every case below is about a publisher field, so it addresses one namespace and these
// keep the call sites about the cells. Namespacing itself is covered separately.
const cellsFor = (fields: Parameters<typeof csvCellsForFields>[0], values: Record<string, unknown>) =>
  csvCellsForFields(fields, { custom_fields: values });

const valuesFrom = (
  fields: Parameters<typeof fieldValuesFromCsvRow>[0],
  row: Record<string, unknown>,
  decodeCell?: (cell: string) => string,
) => fieldValuesFromCsvRow(fields, row, decodeCell).custom_fields ?? {};

describe('custom field CSV cells', function () {
  const nickname = { namespace: 'custom_fields', key: 'nickname', type: 'short_text' } as const;
  const address = { namespace: 'custom_fields', key: 'shipping_address', type: 'address' } as const;

  const ADDRESS_COLUMNS = [
    'custom_fields.shipping_address.line1',
    'custom_fields.shipping_address.line2',
    'custom_fields.shipping_address.city',
    'custom_fields.shipping_address.state',
    'custom_fields.shipping_address.postal_code',
    'custom_fields.shipping_address.country',
  ];

  it('gives a scalar field one column', function () {
    assert.deepEqual(cellsFor([nickname], { nickname: 'Bex' }), {
      'custom_fields.nickname': 'Bex',
    });
  });

  // A key is minted from a publisher-chosen name, so it can land on a column the
  // export already has. Namespacing is what stops the value taking its place.
  it('namespaces a key that collides with a core export column', function () {
    const cells = cellsFor([{ namespace: 'custom_fields', key: 'email', type: 'short_text' }], {
      email: 'a nickname',
    });

    assert.deepEqual(cells, { 'custom_fields.email': 'a nickname' });
    assert.equal(Object.hasOwn(cells, 'email'), false);
  });

  it('expands a composite field into a column per sub-field', function () {
    const cells = cellsFor([address], {
      shipping_address: {
        line1: '1 High Street',
        line2: 'Flat 2',
        city: 'London',
        state: 'Greater London',
        postal_code: 'E1 6AN',
        country: 'GB',
      },
    });

    assert.deepEqual(Object.keys(cells), ADDRESS_COLUMNS);
    assert.equal(cells['custom_fields.shipping_address.line1'], '1 High Street');
    assert.equal(cells['custom_fields.shipping_address.country'], 'GB');
  });

  // The export takes its header from a single row, so a field the member has no
  // value for must still produce its columns or it vanishes from the whole file.
  it('produces the same columns whether or not the member holds a value', function () {
    const withValues = cellsFor([nickname, address], {
      nickname: 'Bex',
      shipping_address: {
        line1: '1 High Street',
        city: 'London',
        postal_code: 'E1 6AN',
        country: 'GB',
      },
    });
    const withNothing = cellsFor([nickname, address], {});

    assert.deepEqual(Object.keys(withNothing), Object.keys(withValues));
    assert.deepEqual(
      Object.values(withNothing),
      new Array(Object.keys(withValues).length).fill(''),
    );
  });

  it('leaves a cell empty for a sub-field the value omits', function () {
    const cells = cellsFor([address], {
      shipping_address: {
        line1: '9 Long Lane',
        city: 'Bristol',
        postal_code: 'BS1 4DJ',
        country: 'GB',
      },
    });

    assert.equal(cells['custom_fields.shipping_address.line2'], '');
    assert.equal(cells['custom_fields.shipping_address.state'], '');
  });

  it('treats an explicit null as no value', function () {
    assert.deepEqual(cellsFor([nickname], { nickname: null }), {
      'custom_fields.nickname': '',
    });
  });
});

// The column names are the vocabulary the admin offers as import mapping targets and
// the error report echoes, so they are derived from the same primitives the cells are.
describe('custom field CSV columns', function () {
  it('gives a scalar field one namespaced column holding no particular part', function () {
    assert.deepEqual(csvColumnsForField({ namespace: 'custom_fields', key: 'nickname', type: 'short_text' }), [
      { column: 'custom_fields.nickname', subField: null },
    ]);
  });

  it('gives a composite field one column per sub-field, each naming the part it holds', function () {
    assert.deepEqual(csvColumnsForField({ namespace: 'custom_fields', key: 'shipping_address', type: 'address' }), [
      { column: 'custom_fields.shipping_address.line1', subField: 'line1' },
      { column: 'custom_fields.shipping_address.line2', subField: 'line2' },
      { column: 'custom_fields.shipping_address.city', subField: 'city' },
      { column: 'custom_fields.shipping_address.state', subField: 'state' },
      { column: 'custom_fields.shipping_address.postal_code', subField: 'postal_code' },
      { column: 'custom_fields.shipping_address.country', subField: 'country' },
    ]);
  });

  it('recognises a custom field column by its namespace', function () {
    assert.equal(isFieldColumn('custom_fields.nickname', 'custom_fields'), true);
    assert.equal(isFieldColumn('custom_fields.shipping_address.city', 'custom_fields'), true);
    assert.equal(isFieldColumn('email', 'custom_fields'), false);
    // A core column that merely starts with the word is not namespaced by it.
    assert.equal(isFieldColumn('custom_fields_note', 'custom_fields'), false);
  });
});

// End-to-end round-tripping is proven in the member import HTTP API tests; the row-level
// reading rules are pinned here.
describe('reading custom field values from a CSV row', function () {
  const nickname = { namespace: 'custom_fields', key: 'nickname', type: 'short_text' } as const;
  const address = { namespace: 'custom_fields', key: 'shipping_address', type: 'address' } as const;

  it('reads a scalar column into its value', function () {
    assert.deepEqual(valuesFrom([nickname], { 'custom_fields.nickname': 'Bex' }), {
      nickname: 'Bex',
    });
  });

  it('leaves a field untouched when its column is absent from the row', function () {
    assert.deepEqual(valuesFrom([nickname], { email: 'a@b.com' }), {});
  });

  // Blank means untouched, not cleared, so re-importing a partly-edited export can't wipe values.
  it('leaves a field untouched when its scalar column is present but blank', function () {
    assert.deepEqual(valuesFrom([nickname], { 'custom_fields.nickname': '' }), {});
  });

  it('reads only active fields, dropping a column that names no passed field', function () {
    assert.deepEqual(
      valuesFrom([nickname], {
        'custom_fields.nickname': 'Bex',
        'custom_fields.unknown': 'ignored',
      }),
      { nickname: 'Bex' },
    );
  });

  // The export writes "no address" and an all-blank address identically, so all-blank is read as absent.
  it('omits a composite whose every sub-cell is blank', function () {
    assert.deepEqual(
      valuesFrom([address], {
        'custom_fields.shipping_address.line1': '',
        'custom_fields.shipping_address.line2': '',
        'custom_fields.shipping_address.city': '',
        'custom_fields.shipping_address.state': '',
        'custom_fields.shipping_address.postal_code': '',
        'custom_fields.shipping_address.country': '',
      }),
      {},
    );
  });

  it('reads a composite from its non-blank sub-cells, omitting the blank ones', function () {
    assert.deepEqual(
      valuesFrom([address], {
        'custom_fields.shipping_address.line1': '1 High Street',
        'custom_fields.shipping_address.line2': '',
        'custom_fields.shipping_address.city': 'London',
        'custom_fields.shipping_address.state': '',
        'custom_fields.shipping_address.postal_code': 'E1 6AN',
        'custom_fields.shipping_address.country': 'GB',
      }),
      {
        shipping_address: {
          line1: '1 High Street',
          city: 'London',
          postal_code: 'E1 6AN',
          country: 'GB',
        },
      },
    );
  });

  // A partial composite is read as a value (validation, run by the caller, is what
  // rejects it) rather than silently dropped like an all-blank one.
  it('reads a partial composite so its validation can fail the row', function () {
    assert.deepEqual(
      valuesFrom([address], {
        'custom_fields.shipping_address.city': 'London',
      }),
      { shipping_address: { city: 'London' } },
    );
  });

  // The caller decodes each cell (the members importer strips the export's formula
  // guard); the vocabulary itself holds no escaping knowledge. Blank-after-decode still
  // reads as untouched, so a decoder can't accidentally write an emptied field.
  it('decodes each cell through the caller-supplied decoder', function () {
    assert.deepEqual(
      valuesFrom([nickname], { 'custom_fields.nickname': ' Bex ' }, (cell) =>
        cell.trim(),
      ),
      { nickname: 'Bex' },
    );
    assert.deepEqual(
      valuesFrom([nickname], { 'custom_fields.nickname': '   ' }, (cell) => cell.trim()),
      {},
    );
  });
});

describe('custom field CSV columns across namespaces', function () {
  const theirs = { namespace: 'custom_fields', key: 'address', type: 'short_text' } as const;
  const ours = { namespace: 'shipping', key: 'address', type: 'short_text' } as const;

  // The same key in two namespaces is two different fields, which is the whole point of
  // having them: neither owner has to know what the other minted.
  it('gives each namespace its own column for the same key', function () {
    assert.deepEqual(
      csvCellsForFields([theirs, ours], {
        custom_fields: { address: 'Theirs' },
        shipping: { address: 'Ours' },
      }),
      {
        'custom_fields.address': 'Theirs',
        'shipping.address': 'Ours',
      },
    );
  });

  it('reads each column back to the namespace that owns it', function () {
    assert.deepEqual(
      fieldValuesFromCsvRow([theirs, ours], {
        'custom_fields.address': 'Theirs',
        'shipping.address': 'Ours',
      }),
      {
        custom_fields: { address: 'Theirs' },
        shipping: { address: 'Ours' },
      },
    );
  });

  it('leaves a namespace out entirely when its column is absent', function () {
    assert.deepEqual(fieldValuesFromCsvRow([theirs, ours], { 'shipping.address': 'Ours' }), {
      shipping: { address: 'Ours' },
    });
  });

  it('names a column by the namespace that owns the field', function () {
    assert.deepEqual(csvColumnsForField(ours), [{ column: 'shipping.address', subField: null }]);
  });

  it('recognises a column of any namespace it is given', function () {
    assert.equal(isFieldColumn('shipping.address', 'shipping'), true);
    assert.equal(isFieldColumn('shipping.address', 'custom_fields'), false);
    assert.equal(isAnyFieldColumn('shipping.address', ['custom_fields', 'shipping']), true);
    assert.equal(isAnyFieldColumn('email', ['custom_fields', 'shipping']), false);
  });
});
