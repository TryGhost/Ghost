import {MembersFieldMapping, detectFieldTypes, formatImportError, getFieldMappings, sampleData} from '@/members/components/bulk-action-modals/import-members/mapping';
import {describe, expect, it} from 'vitest';

describe('mapping helpers', () => {
    it('samples non-empty entries per column', () => {
        const sampled = sampleData([
            {email: '', name: 'A'},
            {email: 'one@example.com', name: 'B'},
            {email: 'two@example.com', name: ''},
            {email: 'three@example.com', name: 'C'},
            {email: '', name: 'D'}
        ], 3);

        expect(sampled.length).toBe(3);
        expect(sampled[0].email).toBe('one@example.com');
        expect(sampled[0].name).toBe('A');
        expect(sampled[2].email).toBe('three@example.com');
        expect(sampled[2].name).toBe('D');
    });

    it('detects email and name mappings', () => {
        const mapping = detectFieldTypes([
            {correo_electronico: 'hello@example.com', first_name: 'A'},
            {correo_electronico: '', first_name: 'B'}
        ]);

        expect(mapping.email).toBe('correo_electronico');
        expect(mapping.name).toBe('first_name');
    });

    it('detects supported fields even when column values are empty', () => {
        // Generate >30 rows so sampleData kicks in
        const rows = Array.from({length: 50}, (_, i) => ({
            email: `user${i}@example.com`,
            name: `User ${i}`,
            note: '',
            subscribed_to_emails: '',
            labels: ''
        }));

        const mapping = detectFieldTypes(rows);

        expect(mapping.email).toBe('email');
        expect(mapping.name).toBe('name');
        expect(mapping.note).toBe('note');
        expect(mapping.subscribed_to_emails).toBe('subscribed_to_emails');
        expect(mapping.labels).toBe('labels');
    });

    it('detects import tier mapping when enabled', () => {
        const mapping = detectFieldTypes([
            {email: 'member@example.com', import_tier: 'Gold'}
        ], {importMemberTier: true});

        expect(mapping.import_tier).toBe('import_tier');
    });

    it('adds tier as an available field mapping when enabled', () => {
        const fieldMappings = getFieldMappings({importMemberTier: true});

        expect(fieldMappings).toContainEqual({label: 'Tier', value: 'import_tier'});
    });

    it('updates mapping while preventing duplicate targets', () => {
        const mapping = new MembersFieldMapping({email: 'Email', name: 'Name'});
        const updated = mapping.updateMapping('Name', 'email');

        expect(updated.get('Name')).toBe('email');
        expect(updated.get('Email')).toBeNull();
    });

    it('formats import errors to user-facing text', () => {
        const formatted = formatImportError('Value in [members.note] exceeds maximum length of 2000 characters.');

        expect(formatted).toContain('Note is too long');
    });

    it('includes Gift ID in field mappings', () => {
        const mappings = getFieldMappings();

        expect(mappings.find(m => m.value === 'gift_id')).toEqual({label: 'Gift ID', value: 'gift_id'});
    });

    it('auto-detects gift_id', () => {
        const mapping = detectFieldTypes([
            {email: 'user@example.com', gift_id: 'some-gift-uuid'}
        ]);

        expect(mapping.gift_id).toBe('gift_id');
    });

    const customFieldColumns = [
        {label: 'Nickname', value: 'custom_fields.nickname'},
        {label: 'Shipping Address (Line 1)', value: 'custom_fields.shipping_address.line1'},
        {label: 'Shipping Address (First name)', value: 'custom_fields.shipping_address.first_name'}
    ];

    it('offers the custom field columns as mapping targets', () => {
        const mappings = getFieldMappings({customFieldColumns});

        expect(mappings).toContainEqual({label: 'Nickname', value: 'custom_fields.nickname'});
        expect(mappings).toContainEqual({label: 'Shipping Address (Line 1)', value: 'custom_fields.shipping_address.line1'});
    });

    it('auto-detects a custom field column by its namespaced header', () => {
        const mapping = detectFieldTypes([
            {email: 'user@example.com', 'custom_fields.nickname': 'Bex'}
        ], {customFieldColumns});

        expect(mapping['custom_fields.nickname']).toBe('custom_fields.nickname');
    });

    // The /name/i heuristic must not claim a custom field sub-column that contains
    // "name" as the member name -- it is auto-mapped to its own field instead.
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
        ], {customFieldColumns: [{label: 'Contact email', value: 'custom_fields.contact_email'}]});

        expect(mapping.email).toBe('email');
        expect(mapping['custom_fields.contact_email']).toBe('custom_fields.contact_email');
    });
});
