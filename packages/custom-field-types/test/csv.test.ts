import assert from 'node:assert/strict';
import {describe, it} from 'vitest';
import {csvCellsForFields} from '../src/csv.ts';

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
