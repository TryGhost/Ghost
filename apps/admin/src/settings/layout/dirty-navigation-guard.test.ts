import {describe, expect, it} from 'vitest';

import {dialogIdentity} from './dirty-navigation-guard-identity';

describe('dialogIdentity', () => {
    it('keeps tabs for one staff record grouped', () => {
        expect(dialogIdentity('/settings/staff/owner')).toBe(dialogIdentity('/settings/staff/owner/social-links'));
    });

    it('distinguishes different records using the same dialog route', () => {
        expect(dialogIdentity('/settings/staff/owner')).not.toBe(dialogIdentity('/settings/staff/author'));
        expect(dialogIdentity('/settings/newsletters/first')).not.toBe(dialogIdentity('/settings/newsletters/second'));
    });

    it('only classifies paths within the exact settings boundary', () => {
        expect(dialogIdentity('/settings')).toBe('settings');
        expect(dialogIdentity('/settings-other')).toBe('outside');
    });
});
