import {describe, it} from 'vitest';
import {expect} from 'vitest';
import {instagramHandleToUrl, instagramUrlToHandle, validateInstagramUrl} from '../../../src/utils/socialUrls/index';

describe('Instagram URL validation', () => {
    it('should return empty string when input is empty', () => {
        expect(validateInstagramUrl('')).toBe('');
    });

    it('should format various Instagram URL formats correctly', () => {
        expect(validateInstagramUrl('instagram.com/johnsmith')).toBe('https://www.instagram.com/johnsmith');
        expect(validateInstagramUrl('https://www.instagram.com/johnsmith')).toBe('https://www.instagram.com/johnsmith');
        expect(validateInstagramUrl('www.instagram.com/john.smith')).toBe('https://www.instagram.com/john.smith');
        expect(validateInstagramUrl('instagram.com/john_smith_123')).toBe('https://www.instagram.com/john_smith_123');
        expect(validateInstagramUrl('@johnsmith')).toBe('https://www.instagram.com/johnsmith');
        expect(validateInstagramUrl('johnsmith')).toBe('https://www.instagram.com/johnsmith');
    });

    it('should reject URLs from other domains', () => {
        expect(() => validateInstagramUrl('https://twitter.com/johnsmith')).toThrow(/The URL must be in a format like https:\/\/www\.instagram\.com\/yourUsername/);
        expect(() => validateInstagramUrl('http://example.com')).toThrow(/The URL must be in a format like https:\/\/www\.instagram\.com\/yourUsername/);
    });

    it('should reject invalid Instagram usernames', () => {
        expect(() => validateInstagramUrl('instagram.com/john-smith')).toThrow(/Your Username is not a valid Instagram Username/); // Hyphen not allowed
        expect(() => validateInstagramUrl('instagram.com/john@smith')).toThrow(/Your Username is not a valid Instagram Username/); // Special character
        expect(() => validateInstagramUrl('instagram.com/.johnsmith')).toThrow(/Your Username is not a valid Instagram Username/); // Leading period
        expect(() => validateInstagramUrl('instagram.com/johnsmith.')).toThrow(/Your Username is not a valid Instagram Username/); // Trailing period
        expect(() => validateInstagramUrl('instagram.com/john..smith')).toThrow(/Your Username is not a valid Instagram Username/); // Consecutive periods
        expect(() => validateInstagramUrl('instagram.com/' + 'a'.repeat(31))).toThrow(/Your Username is not a valid Instagram Username/); // Too long
    });
});

describe('Instagram handle to URL conversion', () => {
    it('should convert Instagram handle to full URL', () => {
        expect(instagramHandleToUrl('johnsmith')).toBe('https://www.instagram.com/johnsmith');
        expect(instagramHandleToUrl('@johnsmith')).toBe('https://www.instagram.com/johnsmith');
        expect(instagramHandleToUrl('john.smith')).toBe('https://www.instagram.com/john.smith');
        expect(instagramHandleToUrl('john_smith_123')).toBe('https://www.instagram.com/john_smith_123');
    });

    it('should reject invalid Instagram handles', () => {
        expect(() => instagramHandleToUrl('john-smith')).toThrow(/Your Username is not a valid Instagram Username/);
        expect(() => instagramHandleToUrl('john@smith')).toThrow(/Your Username is not a valid Instagram Username/);
        expect(() => instagramHandleToUrl('.johnsmith')).toThrow(/Your Username is not a valid Instagram Username/);
        expect(() => instagramHandleToUrl('johnsmith.')).toThrow(/Your Username is not a valid Instagram Username/);
        expect(() => instagramHandleToUrl('john..smith')).toThrow(/Your Username is not a valid Instagram Username/);
        expect(() => instagramHandleToUrl('a'.repeat(31))).toThrow(/Your Username is not a valid Instagram Username/);
    });
});

describe('URL to Instagram handle extraction', () => {
    it('should extract Instagram handle from URL', () => {
        expect(instagramUrlToHandle('https://www.instagram.com/johnsmith')).toBe('johnsmith');
        expect(instagramUrlToHandle('instagram.com/john.smith')).toBe('john.smith');
        expect(instagramUrlToHandle('www.instagram.com/john_smith_123')).toBe('john_smith_123');
    });

    it('should return null for invalid Instagram URLs', () => {
        expect(instagramUrlToHandle('https://example.com/johnsmith')).toBe(null);
        expect(instagramUrlToHandle('invalid-url')).toBe(null);
    });
});