import assert from 'node:assert/strict';
import {describe, it} from 'vitest';
import {csvCellsForFields, csvColumnsForField, fieldValuesFromCsvRow, isCustomFieldColumn} from '../src/csv.ts';

// The behavioural outcomes — an export carrying the right columns, an exported
// file re-importing without remapping — are proven end-to-end through the member
// export and import HTTP API integration tests. What is asserted here is the one
// invariant those tests can only observe indirectly: the key set is fixed by the
// field definitions alone, never by which values a given member happens to hold.
describe('custom field CSV cells', function () {
    const nickname = {key: 'nickname', type: 'short_text'} as const;
    const address = {key: 'shipping_address', type: 'address'} as const;

    const ADDRESS_COLUMNS = [
        'custom_fields.shipping_address.line1',
        'custom_fields.shipping_address.line2',
        'custom_fields.shipping_address.city',
        'custom_fields.shipping_address.state',
        'custom_fields.shipping_address.postal_code',
        'custom_fields.shipping_address.country'
    ];

    it('gives a scalar field one column', function () {
        assert.deepEqual(csvCellsForFields([nickname], {nickname: 'Bex'}), {'custom_fields.nickname': 'Bex'});
    });

    // A key is minted from a publisher-chosen name, so it can land on a column the
    // export already has. Namespacing is what stops the value taking its place.
    it('namespaces a key that collides with a core export column', function () {
        const cells = csvCellsForFields([{key: 'email', type: 'short_text'}], {email: 'a nickname'});

        assert.deepEqual(cells, {'custom_fields.email': 'a nickname'});
        assert.equal(Object.hasOwn(cells, 'email'), false);
    });

    it('expands a composite field into a column per sub-field', function () {
        const cells = csvCellsForFields([address], {
            shipping_address: {
                line1: '1 High Street',
                line2: 'Flat 2',
                city: 'London',
                state: 'Greater London',
                postal_code: 'E1 6AN',
                country: 'GB'
            }
        });

        assert.deepEqual(Object.keys(cells), ADDRESS_COLUMNS);
        assert.equal(cells['custom_fields.shipping_address.line1'], '1 High Street');
        assert.equal(cells['custom_fields.shipping_address.country'], 'GB');
    });

    // The export takes its header from a single row, so a field the member has no
    // value for must still produce its columns or it vanishes from the whole file.
    it('produces the same columns whether or not the member holds a value', function () {
        const withValues = csvCellsForFields([nickname, address], {
            nickname: 'Bex',
            shipping_address: {line1: '1 High Street', city: 'London', postal_code: 'E1 6AN', country: 'GB'}
        });
        const withNothing = csvCellsForFields([nickname, address], {});

        assert.deepEqual(Object.keys(withNothing), Object.keys(withValues));
        assert.deepEqual(Object.values(withNothing), new Array(Object.keys(withValues).length).fill(''));
    });

    it('leaves a cell empty for a sub-field the value omits', function () {
        const cells = csvCellsForFields([address], {
            shipping_address: {line1: '9 Long Lane', city: 'Bristol', postal_code: 'BS1 4DJ', country: 'GB'}
        });

        assert.equal(cells['custom_fields.shipping_address.line2'], '');
        assert.equal(cells['custom_fields.shipping_address.state'], '');
    });

    it('treats an explicit null as no value', function () {
        assert.deepEqual(csvCellsForFields([nickname], {nickname: null}), {'custom_fields.nickname': ''});
    });
});

// The column names are the vocabulary the admin offers as import mapping targets and
// the error report echoes, so they are derived from the same primitives the cells are.
describe('custom field CSV columns', function () {
    it('gives a scalar field one namespaced column', function () {
        assert.deepEqual(csvColumnsForField({key: 'nickname', type: 'short_text'}), ['custom_fields.nickname']);
    });

    it('gives a composite field one column per sub-field', function () {
        assert.deepEqual(csvColumnsForField({key: 'shipping_address', type: 'address'}), [
            'custom_fields.shipping_address.line1',
            'custom_fields.shipping_address.line2',
            'custom_fields.shipping_address.city',
            'custom_fields.shipping_address.state',
            'custom_fields.shipping_address.postal_code',
            'custom_fields.shipping_address.country'
        ]);
    });

    it('recognises a custom field column by its namespace', function () {
        assert.equal(isCustomFieldColumn('custom_fields.nickname'), true);
        assert.equal(isCustomFieldColumn('custom_fields.shipping_address.city'), true);
        assert.equal(isCustomFieldColumn('email'), false);
        // A core column that merely starts with the word is not namespaced by it.
        assert.equal(isCustomFieldColumn('custom_fields_note'), false);
    });
});

// The read that closes the round trip: the exporter's cells fed back through this must
// reconstruct the values a member write takes. Proven end-to-end through the member
// import HTTP API tests; the reading rules the row-level cases turn on are pinned here.
describe('reading custom field values from a CSV row', function () {
    const nickname = {key: 'nickname', type: 'short_text'} as const;
    const address = {key: 'shipping_address', type: 'address'} as const;

    it('reads a scalar column into its value', function () {
        assert.deepEqual(fieldValuesFromCsvRow([nickname], {'custom_fields.nickname': 'Bex'}), {nickname: 'Bex'});
    });

    it('leaves a field untouched when its column is absent from the row', function () {
        assert.deepEqual(fieldValuesFromCsvRow([nickname], {email: 'a@b.com'}), {});
    });

    // A blank cell leaves the field untouched rather than clearing it, so re-importing a
    // partially-edited export cannot silently wipe values the publisher never touched --
    // matching how the importer keeps an existing name or note when its column is blank.
    it('leaves a field untouched when its scalar column is present but blank', function () {
        assert.deepEqual(fieldValuesFromCsvRow([nickname], {'custom_fields.nickname': ''}), {});
    });

    it('reads only active fields, dropping a column that names no passed field', function () {
        assert.deepEqual(fieldValuesFromCsvRow([nickname], {
            'custom_fields.nickname': 'Bex',
            'custom_fields.unknown': 'ignored'
        }), {nickname: 'Bex'});
    });

    // The export writes a value-less member's address as all-blank cells, and it cannot
    // be told apart from an address that is genuinely all blank, so it is read as absent.
    it('omits a composite whose every sub-cell is blank', function () {
        assert.deepEqual(fieldValuesFromCsvRow([address], {
            'custom_fields.shipping_address.line1': '',
            'custom_fields.shipping_address.line2': '',
            'custom_fields.shipping_address.city': '',
            'custom_fields.shipping_address.state': '',
            'custom_fields.shipping_address.postal_code': '',
            'custom_fields.shipping_address.country': ''
        }), {});
    });

    it('reads a composite from its non-blank sub-cells, omitting the blank ones', function () {
        assert.deepEqual(fieldValuesFromCsvRow([address], {
            'custom_fields.shipping_address.line1': '1 High Street',
            'custom_fields.shipping_address.line2': '',
            'custom_fields.shipping_address.city': 'London',
            'custom_fields.shipping_address.state': '',
            'custom_fields.shipping_address.postal_code': 'E1 6AN',
            'custom_fields.shipping_address.country': 'GB'
        }), {shipping_address: {line1: '1 High Street', city: 'London', postal_code: 'E1 6AN', country: 'GB'}});
    });

    // A partial composite is read as a value (validation, run by the caller, is what
    // rejects it) rather than silently dropped like an all-blank one.
    it('reads a partial composite so its validation can fail the row', function () {
        assert.deepEqual(fieldValuesFromCsvRow([address], {
            'custom_fields.shipping_address.city': 'London'
        }), {shipping_address: {city: 'London'}});
    });

    it('strips the export formula guard so a formula-like value round-trips', function () {
        assert.deepEqual(fieldValuesFromCsvRow([nickname], {'custom_fields.nickname': '\'=SUM(A1:A9)'}), {nickname: '=SUM(A1:A9)'});
        // A genuine leading apostrophe before a normal character is left alone.
        assert.deepEqual(fieldValuesFromCsvRow([nickname], {'custom_fields.nickname': '\'tis'}), {nickname: '\'tis'});
    });
});
