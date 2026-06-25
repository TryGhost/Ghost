import {buildGiftLinkUrl} from '@src/utils/gift-link';
import {describe, expect, it} from 'vitest';

describe('buildGiftLinkUrl', () => {
    it('appends ?gift=<token> to the canonical post url', () => {
        expect(buildGiftLinkUrl('https://example.com/my-post/', 'tok123'))
            .toBe('https://example.com/my-post/?gift=tok123');
    });

    it('preserves a subdirectory in the post url', () => {
        expect(buildGiftLinkUrl('https://example.com/blog/my-post/', 'tok123'))
            .toBe('https://example.com/blog/my-post/?gift=tok123');
    });

    it('url-encodes the token', () => {
        expect(buildGiftLinkUrl('https://example.com/p/', 'a/b+c='))
            .toBe('https://example.com/p/?gift=a%2Fb%2Bc%3D');
    });

    it('returns an empty string when either input is missing', () => {
        expect(buildGiftLinkUrl('', 'tok')).toBe('');
        expect(buildGiftLinkUrl('https://example.com/p/', '')).toBe('');
        expect(buildGiftLinkUrl(undefined, undefined)).toBe('');
    });
});
