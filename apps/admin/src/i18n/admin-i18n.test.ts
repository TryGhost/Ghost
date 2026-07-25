import {describe, expect, it} from 'vitest';
import {resolveAdminLocale} from './admin-i18n';

describe('admin locale resolution', () => {
    it('uses Swedish when the browser prefers Swedish', () => {
        expect(resolveAdminLocale(['sv-SE', 'en-US'])).toBe('sv');
    });

    it('uses English when Swedish is not preferred', () => {
        expect(resolveAdminLocale(['en-GB'])).toBe('en');
    });
});
