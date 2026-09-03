import assert from 'node:assert/strict';
import { describe, it } from 'vitest';
import {
  csvCellsForFields,
  csvColumnsForField,
  fieldValuesFromCsvRow,
  isMetafieldColumn,
} from '../src/csv.ts';

// The behavioural outcomes — an export carrying the right columns, an exported
// file re-importing without remapping — are proven end-to-end through the member
// export and import HTTP API integration tests. What is asserted here is the one
// invariant those tests can only observe indirectly: the key set is fixed by the
// field definitions alone, never by which values a given member happens to hold.
describe('metafield CSV cells', function () {
  const nickname = { namespace: 'custom', key: 'nickname', type: 'short_text' } as const;
  const address = { namespace: 'custom', key: 'shipping_address', type: 'address' } as const;

  const ADDRESS_COLUMNS = [
    'metafields.custom.shipping_address.line1',
    'metafields.custom.shipping_address.line2',
    'metafields.custom.shipping_address.city',
    'metafields.custom.shipping_address.state',
    'metafields.custom.shipping_address.postal_code',
    'metafields.custom.shipping_address.country',
  ];

  it('gives a scalar field one column', function () {
    assert.deepEqual(csvCellsForFields([nickname], { custom: { nickname: 'Bex' } }), {
      'metafields.custom.nickname': 'Bex',
    });
  });

  // A key is minted from a publisher-chosen name, so it can land on a column the
  // export already has. Namespacing is what stops the value taking its place.
  it('namespaces a key that collides with a core export column', function () {
    const cells = csvCellsForFields([{ namespace: 'custom', key: 'email', type: 'short_text' }], {
      custom: { email: 'a nickname' },
    });

    assert.deepEqual(cells, { 'metafields.custom.email': 'a nickname' });
    assert.equal(Object.hasOwn(cells, 'email'), false);
  });

  it('expands a composite field into a column per sub-field', function () {
    const cells = csvCellsForFields([address], {
      custom: {
        shipping_address: {
          line1: '1 High Street',
          line2: 'Flat 2',
          city: 'London',
          state: 'Greater London',
          postal_code: 'E1 6AN',
          country: 'GB',
        },
      },
    });

    assert.deepEqual(Object.keys(cells), ADDRESS_COLUMNS);
    assert.equal(cells['metafields.custom.shipping_address.line1'], '1 High Street');
    assert.equal(cells['metafields.custom.shipping_address.country'], 'GB');
  });

  // The export takes its header from a single row, so a field the member has no
  // value for must still produce its columns or it vanishes from the whole file.
  it('produces the same columns whether or not the member holds a value', function () {
    const withValues = csvCellsForFields([nickname, address], {
      custom: {
        nickname: 'Bex',
        shipping_address: {
          line1: '1 High Street',
          city: 'London',
          postal_code: 'E1 6AN',
          country: 'GB',
        },
      },
    });
    const withNothing = csvCellsForFields([nickname, address], {});

    assert.deepEqual(Object.keys(withNothing), Object.keys(withValues));
    assert.deepEqual(
      Object.values(withNothing),
      new Array(Object.keys(withValues).length).fill(''),
    );
  });

  it('leaves a cell empty for a sub-field the value omits', function () {
    const cells = csvCellsForFields([address], {
      custom: {
        shipping_address: {
          line1: '9 Long Lane',
          city: 'Bristol',
          postal_code: 'BS1 4DJ',
          country: 'GB',
        },
      },
    });

    assert.equal(cells['metafields.custom.shipping_address.line2'], '');
    assert.equal(cells['metafields.custom.shipping_address.state'], '');
  });

  it('treats an explicit null as no value', function () {
    assert.deepEqual(csvCellsForFields([nickname], { custom: { nickname: null } }), {
      'metafields.custom.nickname': '',
    });
  });
});

// The column names are the vocabulary the admin offers as import mapping targets and
// the error report echoes, so they are derived from the same primitives the cells are.
describe('metafield CSV columns', function () {
  it('gives a scalar field one namespaced column holding no particular part', function () {
    assert.deepEqual(
      csvColumnsForField({ namespace: 'custom', key: 'nickname', type: 'short_text' }),
      [{ column: 'metafields.custom.nickname', subField: null }],
    );
  });

  it('gives a composite field one column per sub-field, each naming the part it holds', function () {
    assert.deepEqual(
      csvColumnsForField({ namespace: 'custom', key: 'shipping_address', type: 'address' }),
      [
        { column: 'metafields.custom.shipping_address.line1', subField: 'line1' },
        { column: 'metafields.custom.shipping_address.line2', subField: 'line2' },
        { column: 'metafields.custom.shipping_address.city', subField: 'city' },
        { column: 'metafields.custom.shipping_address.state', subField: 'state' },
        { column: 'metafields.custom.shipping_address.postal_code', subField: 'postal_code' },
        { column: 'metafields.custom.shipping_address.country', subField: 'country' },
      ],
    );
  });

  it('recognises a metafield column by its qualifier', function () {
    assert.equal(isMetafieldColumn('metafields.custom.nickname'), true);
    assert.equal(isMetafieldColumn('metafields.custom.shipping_address.city'), true);
    assert.equal(isMetafieldColumn('email'), false);
    // A core column that merely starts with the word is not namespaced by it.
    assert.equal(isMetafieldColumn('custom_fields_note'), false);
  });
});

// End-to-end round-tripping is proven in the member import HTTP API tests; the row-level
// reading rules are pinned here.
describe('reading metafield values from a CSV row', function () {
  const nickname = { namespace: 'custom', key: 'nickname', type: 'short_text' } as const;
  const address = { namespace: 'custom', key: 'shipping_address', type: 'address' } as const;

  it('reads a scalar column into its value', function () {
    assert.deepEqual(fieldValuesFromCsvRow([nickname], { 'metafields.custom.nickname': 'Bex' }), {
      'custom.nickname': 'Bex',
    });
  });

  it('leaves a field untouched when its column is absent from the row', function () {
    assert.deepEqual(fieldValuesFromCsvRow([nickname], { email: 'a@b.com' }), {});
  });

  // Blank means untouched, not cleared, so re-importing a partly-edited export can't wipe values.
  it('leaves a field untouched when its scalar column is present but blank', function () {
    assert.deepEqual(fieldValuesFromCsvRow([nickname], { 'metafields.custom.nickname': '' }), {});
  });

  it('reads only active fields, dropping a column that names no passed field', function () {
    assert.deepEqual(
      fieldValuesFromCsvRow([nickname], {
        'metafields.custom.nickname': 'Bex',
        'metafields.custom.unknown': 'ignored',
      }),
      { 'custom.nickname': 'Bex' },
    );
  });

  // The export writes "no address" and an all-blank address identically, so all-blank is read as absent.
  it('omits a composite whose every sub-cell is blank', function () {
    assert.deepEqual(
      fieldValuesFromCsvRow([address], {
        'metafields.custom.shipping_address.line1': '',
        'metafields.custom.shipping_address.line2': '',
        'metafields.custom.shipping_address.city': '',
        'metafields.custom.shipping_address.state': '',
        'metafields.custom.shipping_address.postal_code': '',
        'metafields.custom.shipping_address.country': '',
      }),
      {},
    );
  });

  it('reads a composite from its non-blank sub-cells, omitting the blank ones', function () {
    assert.deepEqual(
      fieldValuesFromCsvRow([address], {
        'metafields.custom.shipping_address.line1': '1 High Street',
        'metafields.custom.shipping_address.line2': '',
        'metafields.custom.shipping_address.city': 'London',
        'metafields.custom.shipping_address.state': '',
        'metafields.custom.shipping_address.postal_code': 'E1 6AN',
        'metafields.custom.shipping_address.country': 'GB',
      }),
      {
        'custom.shipping_address': {
          line1: '1 High Street',
          city: 'London',
          postal_code: 'E1 6AN',
          country: 'GB',
        },
      },
    );
  });

  // The sub-cells a composite occupies are the parts its value schema declares, so a
  // column naming anything else is dropped the way a column naming no field is. A
  // recipient's name is the one that gets written by hand: a parcel needs one, but it
  // belongs to a field of its own rather than to the address.
  it('drops a sub-cell that names no part of the composite', function () {
    assert.deepEqual(
      fieldValuesFromCsvRow([address], {
        'metafields.custom.shipping_address.name': 'Bex Jones',
        'metafields.custom.shipping_address.city': 'London',
      }),
      { 'custom.shipping_address': { city: 'London' } },
    );
  });

  // A partial composite is read as a value (validation, run by the caller, is what
  // rejects it) rather than silently dropped like an all-blank one.
  it('reads a partial composite so its validation can fail the row', function () {
    assert.deepEqual(
      fieldValuesFromCsvRow([address], {
        'metafields.custom.shipping_address.city': 'London',
      }),
      { 'custom.shipping_address': { city: 'London' } },
    );
  });

  // The caller decodes each cell (the members importer strips the export's formula
  // guard); the vocabulary itself holds no escaping knowledge. Blank-after-decode still
  // reads as untouched, so a decoder can't accidentally write an emptied field.
  it('decodes each cell through the caller-supplied decoder', function () {
    assert.deepEqual(
      fieldValuesFromCsvRow([nickname], { 'metafields.custom.nickname': ' Bex ' }, (cell) =>
        cell.trim(),
      ),
      { 'custom.nickname': 'Bex' },
    );
    assert.deepEqual(
      fieldValuesFromCsvRow([nickname], { 'metafields.custom.nickname': '   ' }, (cell) =>
        cell.trim(),
      ),
      {},
    );
  });
});
