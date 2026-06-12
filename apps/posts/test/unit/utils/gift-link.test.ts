import {buildGiftLinkUrl} from '@src/utils/gift-link';
import {describe, expect, it} from 'vitest';

describe('buildGiftLinkUrl', () => {
    it('composes /g/<slug>/?key=TOKEN&utm_campaign=gift-link', () => {
        const url = buildGiftLinkUrl('https://example.com', 'my-post', 'tok123');
        expect(url).toBe('https://example.com/g/my-post/?key=tok123&utm_campaign=gift-link');
    });

    it('strips trailing slashes from the site url', () => {
        const url = buildGiftLinkUrl('https://example.com/', 'my-post', 'tok123');
        expect(url).toBe('https://example.com/g/my-post/?key=tok123&utm_campaign=gift-link');
    });

    it('preserves a subdirectory in the site url', () => {
        const url = buildGiftLinkUrl('https://example.com/blog', 'my-post', 'tok123');
        expect(url).toBe('https://example.com/blog/g/my-post/?key=tok123&utm_campaign=gift-link');
    });

    it('url-encodes the token', () => {
        const url = buildGiftLinkUrl('https://example.com', 'p', 'a/b+c=');
        expect(url).toContain('key=a%2Fb%2Bc%3D');
        expect(url).toContain('utm_campaign=gift-link');
    });

    it('url-encodes the slug', () => {
        const url = buildGiftLinkUrl('https://example.com', 'a slug/with stuff', 'tok');
        expect(url).toContain('/g/a%20slug%2Fwith%20stuff/');
    });

    it('returns an empty string when any input is missing', () => {
        expect(buildGiftLinkUrl('', 'slug', 'tok')).toBe('');
        expect(buildGiftLinkUrl('https://example.com', '', 'tok')).toBe('');
        expect(buildGiftLinkUrl('https://example.com', 'slug', '')).toBe('');
    });
});
