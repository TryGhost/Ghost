import {type FieldTypePresentation, type MemberCustomField, memberCustomFieldCsvColumns, memberCustomFieldParts} from '../../../src/api/member-custom-fields';

// Compile-time cases: the build failing is the assertion. Each `@ts-expect-error` fails the
// build if the case it names stops being an error. Declared on one line each, because the
// directive only covers the line below it and a spread literal reports on its inner line.
const composite = {line1: 'a', line2: 'b', city: 'c', state: 'd', postal_code: 'e', country: 'f'};

const labelled: FieldTypePresentation<'address'> = {label: 'Address', input: 'address', subFields: composite};

// @ts-expect-error a composite missing one of the parts its value schema declares
const missingPart: FieldTypePresentation<'address'> = {label: 'Address', input: 'address', subFields: {line1: 'a', line2: 'b', city: 'c', state: 'd', country: 'f'}};

// @ts-expect-error a composite naming a part its value schema does not declare
const unknownPart: FieldTypePresentation<'address'> = {label: 'Address', input: 'address', subFields: {...composite, county: 'g'}};

// @ts-expect-error a composite with no part labels at all
const unlabelled: FieldTypePresentation<'address'> = {label: 'Address', input: 'address'};

// @ts-expect-error a type whose value is one thing has no parts to name
const scalarWithParts: FieldTypePresentation<'short_text'> = {label: 'Short text', input: 'text', subFields: {line1: 'a'}};

export {labelled, missingPart, unknownPart, unlabelled, scalarWithParts};

const field = (overrides: Partial<MemberCustomField>): MemberCustomField => ({
    key: 'nickname',
    name: 'Nickname',
    type: 'short_text',
    status: 'active',
    created_at: '2026-07-01T00:00:00.000Z',
    updated_at: null,
    ...overrides
});

describe('member custom fields api helpers', () => {
    describe('memberCustomFieldCsvColumns', () => {
        it('gives a scalar field one target labelled by its name', () => {
            expect(memberCustomFieldCsvColumns([field({key: 'nickname', name: 'Nickname'})])).toEqual([
                {label: 'Nickname', fieldName: 'Nickname', value: 'custom_fields.nickname', type: 'short_text'}
            ]);
        });

        it('expands a composite field into one target per sub-field', () => {
            const columns = memberCustomFieldCsvColumns([field({key: 'shipping_address', name: 'Shipping Address', type: 'address'})]);

            expect(columns).toEqual([
                {label: 'Shipping Address (Address line 1)', fieldName: 'Shipping Address', partLabel: 'Address line 1', value: 'custom_fields.shipping_address.line1', type: 'address'},
                {label: 'Shipping Address (Address line 2)', fieldName: 'Shipping Address', partLabel: 'Address line 2', value: 'custom_fields.shipping_address.line2', type: 'address'},
                {label: 'Shipping Address (City)', fieldName: 'Shipping Address', partLabel: 'City', value: 'custom_fields.shipping_address.city', type: 'address'},
                {label: 'Shipping Address (State)', fieldName: 'Shipping Address', partLabel: 'State', value: 'custom_fields.shipping_address.state', type: 'address'},
                {label: 'Shipping Address (Postal code)', fieldName: 'Shipping Address', partLabel: 'Postal code', value: 'custom_fields.shipping_address.postal_code', type: 'address'},
                {label: 'Shipping Address (Country)', fieldName: 'Shipping Address', partLabel: 'Country', value: 'custom_fields.shipping_address.country', type: 'address'}
            ]);
        });

        it('keeps a bracketed name whole alongside its part', () => {
            const columns = memberCustomFieldCsvColumns([field({key: 'address_home', name: 'Address (Home)', type: 'address'})]);

            expect(columns[2]).toEqual({
                label: 'Address (Home) (City)',
                fieldName: 'Address (Home)',
                partLabel: 'City',
                value: 'custom_fields.address_home.city',
                type: 'address'
            });
        });

        it('returns no targets for an empty field set', () => {
            expect(memberCustomFieldCsvColumns([])).toEqual([]);
        });

        // An admin build older than the server it talks to is handed a type it has no
        // presentation for. The mapping picker offering one fewer column beats it throwing.
        it('offers a whole-column target for a type it has never heard of', () => {
            const future = field({key: 'mystery', name: 'Mystery', type: 'a_type_from_the_future' as MemberCustomField['type']});

            expect(memberCustomFieldCsvColumns([future])).toEqual([
                {label: 'Mystery', fieldName: 'Mystery', value: 'custom_fields.mystery', type: 'a_type_from_the_future'}
            ]);
        });
    });

    describe('memberCustomFieldParts', () => {
        // The null is the contract a caller branches on to tell a composite from a
        // scalar, so it is pinned by name rather than only through the CSV columns.
        it('has no parts for a scalar type', () => {
            expect(memberCustomFieldParts('short_text')).toBeNull();
            expect(memberCustomFieldParts('long_text')).toBeNull();
        });

        it('names a composite type\'s parts in the order its value schema declares them', () => {
            expect(memberCustomFieldParts('address')).toEqual([
                {key: 'line1', label: 'Address line 1'},
                {key: 'line2', label: 'Address line 2'},
                {key: 'city', label: 'City'},
                {key: 'state', label: 'State'},
                {key: 'postal_code', label: 'Postal code'},
                {key: 'country', label: 'Country'}
            ]);
        });
    });
});
