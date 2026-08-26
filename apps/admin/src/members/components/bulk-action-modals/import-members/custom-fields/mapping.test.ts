import {detectFieldTypes, getFieldMappings, suggestedFieldName} from '@/members/components/bulk-action-modals/import-members/custom-fields/mapping';
import {describe, expect, it} from 'vitest';
import {type MemberCustomFieldCsvColumn} from '@tryghost/admin-x-framework/api/member-custom-fields';

// Only what this modal's mapping module adds. Column detection, sampling, the mapping class and
// the error wording are the shared module's, and are covered by its own tests — the custom field
// cases below stay here because they are the reason this modal narrows what it offers.
describe('custom fields mapping helpers', () => {

    it('adds tier as an available field mapping when enabled', () => {
        const fieldMappings = getFieldMappings({importMemberTier: true});

        expect(fieldMappings).toContainEqual({label: 'Tier', value: 'import_tier'});
    });

    const customFieldColumns: MemberCustomFieldCsvColumn[] = [
        {label: 'Nickname', fieldName: 'Nickname', value: 'custom_fields.nickname', type: 'short_text'},
        {label: 'Shipping Address (Line 1)', fieldName: 'Shipping Address', partLabel: 'Line 1', value: 'custom_fields.shipping_address.line1', type: 'address'},
        {label: 'Shipping Address (First name)', fieldName: 'Shipping Address', partLabel: 'First name', value: 'custom_fields.shipping_address.first_name', type: 'address'}
    ];

    it('auto-detects a custom field column by its namespaced header', () => {
        const mapping = detectFieldTypes([
            {email: 'user@example.com', 'custom_fields.nickname': 'Bex'}
        ], {customFieldColumns});

        expect(mapping['custom_fields.nickname']).toBe('custom_fields.nickname');
    });

    // The /name/i heuristic must not claim a custom field column containing "name".
    it('does not map a name-like custom field column to the member name', () => {
        const mapping = detectFieldTypes([
            {email: 'user@example.com', 'custom_fields.shipping_address.first_name': 'Bex'}
        ], {customFieldColumns});

        expect(mapping.name).toBeUndefined();
        expect(mapping['custom_fields.shipping_address.first_name']).toBe('custom_fields.shipping_address.first_name');
    });

    // Even a namespaced column with no offered target (its field archived after export,
    // or a hand-built file) must not be claimed as the member name.
    it('does not map a name-like namespaced column that has no offered target', () => {
        const mapping = detectFieldTypes([
            {email: 'user@example.com', 'custom_fields.former_field.last_name': 'Bex'}
        ]);

        expect(mapping.name).toBeUndefined();
    });

    // An email-typed custom field must not be bound to the member email (and thereby
    // dropped) just because its values look like email addresses.
    it('does not bind an email-valued custom field column to the member email', () => {
        const mapping = detectFieldTypes([
            {'custom_fields.contact_email': 'contact@example.com', email: 'member@example.com'}
        ], {customFieldColumns: [{label: 'Contact email', fieldName: 'Contact email', value: 'custom_fields.contact_email', type: 'short_text'}]});

        expect(mapping.email).toBe('email');
        expect(mapping['custom_fields.contact_email']).toBe('custom_fields.contact_email');
    });

    describe('suggestedFieldName', () => {
        it('strips the namespace and un-slugs a column from a Ghost export', () => {
            expect(suggestedFieldName('custom_fields.nickname')).toBe('Nickname');
            expect(suggestedFieldName('custom_fields.favorite-animal')).toBe('Favorite animal');
        });

        // The part is a separate question the form asks, so it must not end up in the name.
        it('names the field, not the part, for a composite column', () => {
            expect(suggestedFieldName('custom_fields.home-address.city')).toBe('Home address');
            expect(suggestedFieldName('custom_fields.home-address.postal_code')).toBe('Home address');
        });

        it('keeps a column from anywhere else as the publisher wrote it', () => {
            expect(suggestedFieldName('Job Title')).toBe('Job Title');
            expect(suggestedFieldName('job_title')).toBe('Job title');
        });
    });
});
