import {describe, it} from 'vitest';
import {expect} from 'vitest';
import {tiktokHandleToUrl, tiktokUrlToHandle, validateTikTokUrl} from '../../../src/utils/socialUrls/index';

describe('TikTok URL validation', () => {
    it('should return empty string when input is empty', () => {
        expect(validateTikTokUrl('')).toBe('');
    });

    it('should format various TikTok URL formats correctly', () => {
        expect(validateTikTokUrl('tiktok.com/@johnsmith')).toBe('https://www.tiktok.com/@johnsmith');
        expect(validateTikTokUrl('https://www.tiktok.com/@johnsmith')).toBe('https://www.tiktok.com/@johnsmith');
        expect(validateTikTokUrl('www.tiktok.com/@john.smith')).toBe('https://www.tiktok.com/@john.smith');
        expect(validateTikTokUrl('tiktok.com/@john_smith123')).toBe('https://www.tiktok.com/@john_smith123');
        expect(validateTikTokUrl('@johnsmith')).toBe('https://www.tiktok.com/@johnsmith');
        expect(validateTikTokUrl('johnsmith')).toBe('https://www.tiktok.com/@johnsmith');
    });

    it('should reject URLs from other domains', () => {
        expect(() => validateTikTokUrl('https://twitter.com/@johnsmith')).toThrow(/The URL must be in a format like https:\/\/www\.tiktok\.com\/@yourUsername/);
        expect(() => validateTikTokUrl('http://example.com')).toThrow(/The URL must be in a format like https:\/\/www\.tiktok\.com\/@yourUsername/);
    });

    it('should reject invalid TikTok usernames', () => {
        expect(() => validateTikTokUrl('tiktok.com/@john-smith')).toThrow(/Your Username is not a valid TikTok Username/); // Hyphen not allowed
        expect(() => validateTikTokUrl('tiktok.com/@john@smith')).toThrow(/Your Username is not a valid TikTok Username/); // Special character
        expect(() => validateTikTokUrl('tiktok.com/@.johnsmith')).toThrow(/Your Username is not a valid TikTok Username/); // Leading period
        expect(() => validateTikTokUrl('tiktok.com/@john..smith')).toThrow(/Your Username is not a valid TikTok Username/); // Consecutive periods
        expect(() => validateTikTokUrl('tiktok.com/@j')).toThrow(/Your Username is not a valid TikTok Username/); // Too short
        expect(() => validateTikTokUrl('tiktok.com/@' + 'a'.repeat(25))).toThrow(/Your Username is not a valid TikTok Username/); // Too long
    });
});

describe('TikTok handle to URL conversion', () => {
    it('should convert TikTok handle to full URL', () => {
        expect(tiktokHandleToUrl('johnsmith')).toBe('https://www.tiktok.com/@johnsmith');
        expect(tiktokHandleToUrl('@johnsmith')).toBe('https://www.tiktok.com/@johnsmith');
        expect(tiktokHandleToUrl('john.smith')).toBe('https://www.tiktok.com/@john.smith');
        expect(tiktokHandleToUrl('john_smith123')).toBe('https://www.tiktok.com/@john_smith123');
    });

    it('should reject invalid TikTok handles', () => {
        expect(() => tiktokHandleToUrl('john-smith')).toThrow(/Your Username is not a valid TikTok Username/);
        expect(() => tiktokHandleToUrl('john@smith')).toThrow(/Your Username is not a valid TikTok Username/);
        expect(() => tiktokHandleToUrl('.johnsmith')).toThrow(/Your Username is not a valid TikTok Username/);
        expect(() => tiktokHandleToUrl('john..smith')).toThrow(/Your Username is not a valid TikTok Username/);
        expect(() => tiktokHandleToUrl('j')).toThrow(/Your Username is not a valid TikTok Username/);
        expect(() => tiktokHandleToUrl('a'.repeat(25))).toThrow(/Your Username is not a valid TikTok Username/);
    });
});

describe('URL to TikTok handle extraction', () => {
    it('should extract TikTok handle from URL', () => {
        expect(tiktokUrlToHandle('https://www.tiktok.com/@johnsmith')).toBe('@johnsmith');
        expect(tiktokUrlToHandle('https://www.tiktok.com/@john.smith')).toBe('@john.smith');
        expect(tiktokUrlToHandle('tiktok.com/@john_smith123')).toBe('@john_smith123');
        expect(tiktokUrlToHandle('www.tiktok.com/@johnsmith')).toBe('@johnsmith');
    });

    it('should return null for invalid TikTok URLs', () => {
        expect(tiktokUrlToHandle('https://example.com/@johnsmith')).toBe(null);
        expect(tiktokUrlToHandle('invalid-url')).toBe(null);
    });
});
