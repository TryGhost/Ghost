import {blueskyHandleToUrl, blueskyUrlToHandle, validateBlueskyUrl} from '../../../src/utils/socialUrls/index';
import {describe, it} from 'vitest';
import {expect} from 'vitest';

describe('Bluesky URLs', () => {
    describe('URL validation', () => {
        it('should return empty string when input is empty', () => {
            expect(validateBlueskyUrl('')).toBe('');
        });

        it('handles domain usernames', () => {
            expect(validateBlueskyUrl('thisusernameistoolongforblueskybutisadomain.com')).toBe('https://bsky.app/profile/thisusernameistoolongforblueskybutisadomain.com');
        });

        it('should format various Bluesky URL formats correctly', () => {
            expect(validateBlueskyUrl('bsky.app/profile/username')).toBe('https://bsky.app/profile/username');
            expect(validateBlueskyUrl('https://bsky.app/profile/username')).toBe('https://bsky.app/profile/username');
            expect(validateBlueskyUrl('www.bsky.app/profile/username')).toBe('https://bsky.app/profile/username');
            expect(validateBlueskyUrl('@username')).toBe('https://bsky.app/profile/username');
            expect(validateBlueskyUrl('username')).toBe('https://bsky.app/profile/username');
        });

        it('should reject URLs from other domains', () => {
            expect(() => validateBlueskyUrl('https://twitter.com/username')).toThrow(/The URL must be in a format like https:\/\/bsky\.app\/profile\/yourUsername/);
            expect(() => validateBlueskyUrl('http://example.com')).toThrow(/The URL must be in a format like https:\/\/bsky\.app\/profile\/yourUsername/);
        });

        it('should reject invalid Bluesky usernames', () => {
            expect(() => validateBlueskyUrl('bsky.app/profile/username@')).toThrow(/Your Username is not a valid Bluesky Username/);
            expect(() => validateBlueskyUrl('bsky.app/profile/username!')).toThrow(/Your Username is not a valid Bluesky Username/);
            expect(() => validateBlueskyUrl('bsky.app/profile/thisusernameistoolongforbluesky')).toThrow(/Your Username is not a valid Bluesky Username/);
        });
    });

    describe('Handle to URL conversion', () => {
        it('should convert Bluesky handle to full URL', () => {
            expect(blueskyHandleToUrl('username')).toBe('https://bsky.app/profile/username');
            expect(blueskyHandleToUrl('@username')).toBe('https://bsky.app/profile/username');
        });

        it('should reject invalid Bluesky handles', () => {
            expect(() => blueskyHandleToUrl('username@')).toThrow(/Your Username is not a valid Bluesky Username/);
            expect(() => blueskyHandleToUrl('username!')).toThrow(/Your Username is not a valid Bluesky Username/);
            expect(() => blueskyHandleToUrl('thisusernameistoolongforbluesky')).toThrow(/Your Username is not a valid Bluesky Username/);
        });
    });

    describe('URL to handle extraction', () => {
        it('should extract Bluesky handle from URL', () => {
            expect(blueskyUrlToHandle('https://bsky.app/profile/username')).toBe('username');
            expect(blueskyUrlToHandle('https://bsky.app/profile/@username')).toBe('username');
            expect(blueskyUrlToHandle('bsky.app/profile/username')).toBe('username');
        });

        it('should return null for invalid Bluesky URLs', () => {
            expect(blueskyUrlToHandle('https://example.com/username')).toBe(null);
            expect(blueskyUrlToHandle('invalid-url')).toBe(null);
        });
    });
}); 