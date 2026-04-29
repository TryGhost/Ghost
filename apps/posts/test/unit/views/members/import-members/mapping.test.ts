import {MembersFieldMapping, detectFieldTypes, formatImportError, getFieldMappings, sampleData} from '@src/views/members/components/bulk-action-modals/import-members/mapping';
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

    it('omits Gift ID from field mappings when giftSubscriptions is disabled', () => {
        const mappings = getFieldMappings({giftSubscriptionsEnabled: false});

        expect(mappings.find(m => m.value === 'gift_id')).toBeUndefined();
    });

    it('includes Gift ID in field mappings when giftSubscriptions is enabled', () => {
        const mappings = getFieldMappings({giftSubscriptionsEnabled: true});

        expect(mappings.find(m => m.value === 'gift_id')).toEqual({label: 'Gift ID', value: 'gift_id'});
    });

    it('does not auto-detect gift_id when giftSubscriptions is disabled', () => {
        const mapping = detectFieldTypes([
            {email: 'user@example.com', gift_id: 'some-gift-uuid'}
        ]);

        expect(mapping.gift_id).toBeUndefined();
    });

    it('auto-detects gift_id when giftSubscriptions is enabled', () => {
        const mapping = detectFieldTypes(
            [{email: 'user@example.com', gift_id: 'some-gift-uuid'}],
            {giftSubscriptionsEnabled: true}
        );

        expect(mapping.gift_id).toBe('gift_id');
    });
});
