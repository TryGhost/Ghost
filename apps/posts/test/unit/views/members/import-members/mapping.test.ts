import {MembersFieldMapping, detectFieldTypes, formatImportError, sampleData} from '@src/views/members/components/bulk-action-modals/import-members/mapping';
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
});
