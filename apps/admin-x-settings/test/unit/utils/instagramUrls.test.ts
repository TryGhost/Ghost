import * as assert from 'assert/strict';
import {instagramHandleToUrl, instagramUrlToHandle, validateInstagramUrl} from '../../../src/utils/socialUrls/index';

describe('Instagram URL validation', () => {
    it('should return empty string when input is empty', () => {
        assert.equal(validateInstagramUrl(''), '');
    });

    it('should format various Instagram URL formats correctly', () => {
        assert.equal(validateInstagramUrl('instagram.com/johnsmith'), 'https://www.instagram.com/johnsmith');
        assert.equal(validateInstagramUrl('https://www.instagram.com/johnsmith'), 'https://www.instagram.com/johnsmith');
        assert.equal(validateInstagramUrl('www.instagram.com/john.smith'), 'https://www.instagram.com/john.smith');
        assert.equal(validateInstagramUrl('instagram.com/john_smith_123'), 'https://www.instagram.com/john_smith_123');
        assert.equal(validateInstagramUrl('@johnsmith'), 'https://www.instagram.com/johnsmith');
        assert.equal(validateInstagramUrl('johnsmith'), 'https://www.instagram.com/johnsmith');
    });

    it('should reject URLs from other domains', () => {
        assert.throws(() => validateInstagramUrl('https://twitter.com/johnsmith'), /The URL must be in a format like https:\/\/www\.instagram\.com\/yourUsername/);
        assert.throws(() => validateInstagramUrl('http://example.com'), /The URL must be in a format like https:\/\/www\.instagram\.com\/yourUsername/);
    });

    it('should reject invalid Instagram usernames', () => {
        assert.throws(() => validateInstagramUrl('instagram.com/john-smith'), /Your Username is not a valid Instagram Username/); // Hyphen not allowed
        assert.throws(() => validateInstagramUrl('instagram.com/john@smith'), /Your Username is not a valid Instagram Username/); // Special character
        assert.throws(() => validateInstagramUrl('instagram.com/.johnsmith'), /Your Username is not a valid Instagram Username/); // Leading period
        assert.throws(() => validateInstagramUrl('instagram.com/johnsmith.'), /Your Username is not a valid Instagram Username/); // Trailing period
        assert.throws(() => validateInstagramUrl('instagram.com/john..smith'), /Your Username is not a valid Instagram Username/); // Consecutive periods
        assert.throws(() => validateInstagramUrl('instagram.com/' + 'a'.repeat(31)), /Your Username is not a valid Instagram Username/); // Too long
    });
});

describe('Instagram handle to URL conversion', () => {
    it('should convert Instagram handle to full URL', () => {
        assert.equal(instagramHandleToUrl('johnsmith'), 'https://www.instagram.com/johnsmith');
        assert.equal(instagramHandleToUrl('@johnsmith'), 'https://www.instagram.com/johnsmith');
        assert.equal(instagramHandleToUrl('john.smith'), 'https://www.instagram.com/john.smith');
        assert.equal(instagramHandleToUrl('john_smith_123'), 'https://www.instagram.com/john_smith_123');
    });

    it('should reject invalid Instagram handles', () => {
        assert.throws(() => instagramHandleToUrl('john-smith'), /Your Username is not a valid Instagram Username/);
        assert.throws(() => instagramHandleToUrl('john@smith'), /Your Username is not a valid Instagram Username/);
        assert.throws(() => instagramHandleToUrl('.johnsmith'), /Your Username is not a valid Instagram Username/);
        assert.throws(() => instagramHandleToUrl('johnsmith.'), /Your Username is not a valid Instagram Username/);
        assert.throws(() => instagramHandleToUrl('john..smith'), /Your Username is not a valid Instagram Username/);
        assert.throws(() => instagramHandleToUrl('a'.repeat(31)), /Your Username is not a valid Instagram Username/);
    });
});

describe('URL to Instagram handle extraction', () => {
    it('should extract Instagram handle from URL', () => {
        assert.equal(instagramUrlToHandle('https://www.instagram.com/johnsmith'), 'johnsmith');
        assert.equal(instagramUrlToHandle('instagram.com/john.smith'), 'john.smith');
        assert.equal(instagramUrlToHandle('www.instagram.com/john_smith_123'), 'john_smith_123');
    });

    it('should return null for invalid Instagram URLs', () => {
        assert.equal(instagramUrlToHandle('https://example.com/johnsmith'), null);
        assert.equal(instagramUrlToHandle('invalid-url'), null);
    });
});