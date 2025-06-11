import * as assert from 'assert/strict';
import {blueskyHandleToUrl, blueskyUrlToHandle, validateBlueskyUrl} from '../../../src/utils/socialUrls/index';

describe('Bluesky URLs', () => {
    describe('URL validation', () => {
        it('should return empty string when input is empty', () => {
            assert.equal(validateBlueskyUrl(''), '');
        });

        it('handles domain usernames', () => {
            assert.equal(validateBlueskyUrl('thisusernameistoolongforblueskybutisadomain.com'), 'https://bsky.app/profile/thisusernameistoolongforblueskybutisadomain.com');
        });

        it('should format various Bluesky URL formats correctly', () => {
            assert.equal(validateBlueskyUrl('bsky.app/profile/username'), 'https://bsky.app/profile/username');
            assert.equal(validateBlueskyUrl('https://bsky.app/profile/username'), 'https://bsky.app/profile/username');
            assert.equal(validateBlueskyUrl('www.bsky.app/profile/username'), 'https://bsky.app/profile/username');
            assert.equal(validateBlueskyUrl('@username'), 'https://bsky.app/profile/username');
            assert.equal(validateBlueskyUrl('username'), 'https://bsky.app/profile/username');
        });

        it('should reject URLs from other domains', () => {
            assert.throws(() => validateBlueskyUrl('https://twitter.com/username'), /The URL must be in a format like https:\/\/bsky\.app\/profile\/yourUsername/);
            assert.throws(() => validateBlueskyUrl('http://example.com'), /The URL must be in a format like https:\/\/bsky\.app\/profile\/yourUsername/);
        });

        it('should reject invalid Bluesky usernames', () => {
            assert.throws(() => validateBlueskyUrl('bsky.app/profile/username@'), /Your Username is not a valid Bluesky Username/);
            assert.throws(() => validateBlueskyUrl('bsky.app/profile/username!'), /Your Username is not a valid Bluesky Username/);
            assert.throws(() => validateBlueskyUrl('bsky.app/profile/thisusernameistoolongforbluesky'), /Your Username is not a valid Bluesky Username/);
        });
    });

    describe('Handle to URL conversion', () => {
        it('should convert Bluesky handle to full URL', () => {
            assert.equal(blueskyHandleToUrl('username'), 'https://bsky.app/profile/username');
            assert.equal(blueskyHandleToUrl('@username'), 'https://bsky.app/profile/username');
        });

        it('should reject invalid Bluesky handles', () => {
            assert.throws(() => blueskyHandleToUrl('username@'), /Your Username is not a valid Bluesky Username/);
            assert.throws(() => blueskyHandleToUrl('username!'), /Your Username is not a valid Bluesky Username/);
            assert.throws(() => blueskyHandleToUrl('thisusernameistoolongforbluesky'), /Your Username is not a valid Bluesky Username/);
        });
    });

    describe('URL to handle extraction', () => {
        it('should extract Bluesky handle from URL', () => {
            assert.equal(blueskyUrlToHandle('https://bsky.app/profile/username'), 'username');
            assert.equal(blueskyUrlToHandle('https://bsky.app/profile/@username'), 'username');
            assert.equal(blueskyUrlToHandle('bsky.app/profile/username'), 'username');
        });

        it('should return null for invalid Bluesky URLs', () => {
            assert.equal(blueskyUrlToHandle('https://example.com/username'), null);
            assert.equal(blueskyUrlToHandle('invalid-url'), null);
        });
    });
}); 