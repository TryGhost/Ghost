import {describe, it} from 'vitest';
import {expect} from 'vitest';
import {facebookHandleToUrl, facebookUrlToHandle, validateFacebookUrl} from '../../../src/utils/socialUrls/index';

describe('Facebook URLs', () => {
    describe('URL validation', () => {
        it('should return empty string when input is empty', () => {
            expect(validateFacebookUrl('')).toBe('');
        });

        it('should format various Facebook URL formats correctly', () => {
            expect(validateFacebookUrl('facebook.com/myPage')).toBe('https://www.facebook.com/myPage');
            expect(validateFacebookUrl('https://www.facebook.com/myPage')).toBe('https://www.facebook.com/myPage');
            expect(validateFacebookUrl('www.facebook.com/myPage')).toBe('https://www.facebook.com/myPage');
            expect(validateFacebookUrl('/myPage')).toBe('https://www.facebook.com/myPage');
        });

        it('should reject URLs from other domains', () => {
            expect(() => validateFacebookUrl('https://twitter.com/myPage')).toThrow(/The URL must be in a format like https:\/\/www\.facebook\.com\/yourPage/);
            expect(() => validateFacebookUrl('http://example.com')).toThrow(/The URL must be in a format like https:\/\/www\.facebook\.com\/yourPage/);
        });
    });

    describe('Handle to URL conversion', () => {
        it('should convert Facebook handle to full URL', () => {
            expect(facebookHandleToUrl('myPage')).toBe('https://www.facebook.com/myPage');
        });
    });

    describe('URL to handle extraction', () => {
        it('should extract Facebook handle from URL', () => {
            expect(facebookUrlToHandle('https://www.facebook.com/myPage')).toBe('myPage');
            expect(facebookUrlToHandle('https://www.facebook.com/myPage/')).toBe('myPage/');
            expect(facebookUrlToHandle('invalid-url')).toBe(null);
        });
    });
}); 