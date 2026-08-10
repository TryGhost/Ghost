import {canCreateLabel} from '@/members/label-picker/can-create-label';
import {describe, expect, it} from 'vitest';

const labels = [{id: '1', name: 'Existing Label', slug: 'existing-label', created_at: '', updated_at: ''}];

describe('canCreateLabel', () => {
    it('hides create for an exact match regardless of case and surrounding whitespace', () => {
        expect(canCreateLabel(labels, 'existing label')).toBe(false);
        expect(canCreateLabel(labels, '  Existing Label  ')).toBe(false);
    });

    it('allows create for partial matches and new names', () => {
        expect(canCreateLabel(labels, 'Existing')).toBe(true);
        expect(canCreateLabel(labels, 'New Label')).toBe(true);
    });

    it('disallows create for empty input', () => {
        expect(canCreateLabel(labels, '   ')).toBe(false);
        expect(canCreateLabel([], '')).toBe(false);
    });
});
