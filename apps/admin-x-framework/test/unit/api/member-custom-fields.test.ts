import {type MemberCustomField, memberCustomFieldCsvColumns} from '../../../src/api/member-custom-fields';

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
                {label: 'Nickname', value: 'custom_fields.nickname'}
            ]);
        });

        it('expands a composite field into one target per sub-field', () => {
            const columns = memberCustomFieldCsvColumns([field({key: 'shipping_address', name: 'Shipping Address', type: 'address'})]);

            expect(columns).toEqual([
                {label: 'Shipping Address (Line 1)', value: 'custom_fields.shipping_address.line1'},
                {label: 'Shipping Address (Line 2)', value: 'custom_fields.shipping_address.line2'},
                {label: 'Shipping Address (City)', value: 'custom_fields.shipping_address.city'},
                {label: 'Shipping Address (State)', value: 'custom_fields.shipping_address.state'},
                {label: 'Shipping Address (Postal code)', value: 'custom_fields.shipping_address.postal_code'},
                {label: 'Shipping Address (Country)', value: 'custom_fields.shipping_address.country'}
            ]);
        });

        it('returns no targets for an empty field set', () => {
            expect(memberCustomFieldCsvColumns([])).toEqual([]);
        });
    });
});
