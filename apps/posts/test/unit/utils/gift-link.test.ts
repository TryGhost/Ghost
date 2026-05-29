import {buildGiftLinkUrl} from '@src/utils/gift-link';
import {describe, expect, it} from 'vitest';

describe('buildGiftLinkUrl', () => {
    it('appends the gift token and campaign to a clean post url', () => {
        const url = buildGiftLinkUrl('https://example.com/my-post/', 'tok123');
        expect(url).toBe('https://example.com/my-post/?gift=tok123&utm_campaign=gift-link');
    });

    it('uses & when the post url already has a query string', () => {
        const url = buildGiftLinkUrl('https://example.com/my-post/?foo=bar', 'tok123');
        expect(url).toBe('https://example.com/my-post/?foo=bar&gift=tok123&utm_campaign=gift-link');
    });

    it('url-encodes the token', () => {
        const url = buildGiftLinkUrl('https://example.com/p/', 'a/b+c=');
        expect(url).toContain('gift=a%2Fb%2Bc%3D');
        expect(url).toContain('utm_campaign=gift-link');
    });

    it('returns an empty string when inputs are missing', () => {
        expect(buildGiftLinkUrl('', 'tok')).toBe('');
        expect(buildGiftLinkUrl('https://example.com/p/', '')).toBe('');
    });
});
