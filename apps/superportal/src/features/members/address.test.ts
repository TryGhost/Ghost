import {describe, it, expect} from 'vitest';
import {getSupportAddress, getDefaultNewsletterSender} from './utils';
import type {SiteState} from '../../types';

function site(overrides: Partial<SiteState> = {}): SiteState {
    return {title: 'Blog', url: 'https://www.example.com/', locale: 'en', ...overrides};
}

describe('getSupportAddress', () => {
    it('prefers the calculated support_email_address', () => {
        expect(getSupportAddress(site({support_email_address: 'help@example.com'}))).toBe('help@example.com');
    });

    it('falls back to noreply@<hostname>', () => {
        expect(getSupportAddress(site())).toBe('noreply@www.example.com');
    });
});

describe('getDefaultNewsletterSender', () => {
    it('uses the first active newsletter sender_email when set', () => {
        const s = site({
            default_email_address: 'default@example.com',
            newsletters: [
                {id: 'a', name: 'Archived', status: 'archived', sender_email: 'archived@example.com'},
                {id: 'b', name: 'Weekly', status: 'active', sender_email: 'weekly@example.com'}
            ]
        });
        expect(getDefaultNewsletterSender(s)).toBe('weekly@example.com');
    });

    it('falls back to default_email_address', () => {
        expect(getDefaultNewsletterSender(site({default_email_address: 'default@example.com'}))).toBe('default@example.com');
    });

    it('falls back to noreply@<hostname> when nothing is set', () => {
        expect(getDefaultNewsletterSender(site())).toBe('noreply@www.example.com');
    });
});
