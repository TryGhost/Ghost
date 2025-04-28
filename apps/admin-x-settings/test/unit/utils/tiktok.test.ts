import * as assert from 'assert/strict';
import {tiktokHandleToUrl, tiktokUrlToHandle, validateTikTokUrl} from '../../../src/utils/socialUrls/index';

describe('TikTok URL validation', () => {
    it('should return empty string when input is empty', () => {
        assert.equal(validateTikTokUrl(''), '');
    });

    it('should format various TikTok URL formats correctly', () => {
        assert.equal(validateTikTokUrl('tiktok.com/@johnsmith'), 'https://www.tiktok.com/@johnsmith');
        assert.equal(validateTikTokUrl('https://www.tiktok.com/@johnsmith'), 'https://www.tiktok.com/@johnsmith');
        assert.equal(validateTikTokUrl('www.tiktok.com/@john.smith'), 'https://www.tiktok.com/@john.smith');
        assert.equal(validateTikTokUrl('tiktok.com/@john_smith123'), 'https://www.tiktok.com/@john_smith123');
        assert.equal(validateTikTokUrl('@johnsmith'), 'https://www.tiktok.com/@johnsmith');
        assert.equal(validateTikTokUrl('johnsmith'), 'https://www.tiktok.com/@johnsmith');
    });

    it('should reject URLs from other domains', () => {
        assert.throws(() => validateTikTokUrl('https://twitter.com/@johnsmith'), /The URL must be in a format like https:\/\/www\.tiktok\.com\/@yourUsername/);
        assert.throws(() => validateTikTokUrl('http://example.com'), /The URL must be in a format like https:\/\/www\.tiktok\.com\/@yourUsername/);
    });

    it('should reject invalid TikTok usernames', () => {
        assert.throws(() => validateTikTokUrl('tiktok.com/@john-smith'), /Your Username is not a valid TikTok Username/); // Hyphen not allowed
        assert.throws(() => validateTikTokUrl('tiktok.com/@john@smith'), /Your Username is not a valid TikTok Username/); // Special character
        assert.throws(() => validateTikTokUrl('tiktok.com/@.johnsmith'), /Your Username is not a valid TikTok Username/); // Leading period
        assert.throws(() => validateTikTokUrl('tiktok.com/@john..smith'), /Your Username is not a valid TikTok Username/); // Consecutive periods
        assert.throws(() => validateTikTokUrl('tiktok.com/@j'), /Your Username is not a valid TikTok Username/); // Too short
        assert.throws(() => validateTikTokUrl('tiktok.com/@' + 'a'.repeat(25)), /Your Username is not a valid TikTok Username/); // Too long
    });
});

describe('TikTok handle to URL conversion', () => {
    it('should convert TikTok handle to full URL', () => {
        assert.equal(tiktokHandleToUrl('johnsmith'), 'https://www.tiktok.com/@johnsmith');
        assert.equal(tiktokHandleToUrl('@johnsmith'), 'https://www.tiktok.com/@johnsmith');
        assert.equal(tiktokHandleToUrl('john.smith'), 'https://www.tiktok.com/@john.smith');
        assert.equal(tiktokHandleToUrl('john_smith123'), 'https://www.tiktok.com/@john_smith123');
    });

    it('should reject invalid TikTok handles', () => {
        assert.throws(() => tiktokHandleToUrl('john-smith'), /Your Username is not a valid TikTok Username/);
        assert.throws(() => tiktokHandleToUrl('john@smith'), /Your Username is not a valid TikTok Username/);
        assert.throws(() => tiktokHandleToUrl('.johnsmith'), /Your Username is not a valid TikTok Username/);
        assert.throws(() => tiktokHandleToUrl('john..smith'), /Your Username is not a valid TikTok Username/);
        assert.throws(() => tiktokHandleToUrl('j'), /Your Username is not a valid TikTok Username/);
        assert.throws(() => tiktokHandleToUrl('a'.repeat(25)), /Your Username is not a valid TikTok Username/);
    });
});

describe('URL to TikTok handle extraction', () => {
    it('should extract TikTok handle from URL', () => {
        assert.equal(tiktokUrlToHandle('https://www.tiktok.com/@johnsmith'), '@johnsmith');
        assert.equal(tiktokUrlToHandle('https://www.tiktok.com/@john.smith'), '@john.smith');
        assert.equal(tiktokUrlToHandle('tiktok.com/@john_smith123'), '@john_smith123');
        assert.equal(tiktokUrlToHandle('www.tiktok.com/@johnsmith'), '@johnsmith');
    });

    it('should return null for invalid TikTok URLs', () => {
        assert.equal(tiktokUrlToHandle('https://example.com/@johnsmith'), null);
        assert.equal(tiktokUrlToHandle('invalid-url'), null);
    });
});
