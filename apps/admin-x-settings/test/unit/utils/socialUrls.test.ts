import * as assert from 'assert/strict';
import {blueskyHandleToUrl, blueskyUrlToHandle, facebookHandleToUrl, facebookUrlToHandle, threadsHandleToUrl, threadsUrlToHandle, twitterHandleToUrl, twitterUrlToHandle, validateBlueskyUrl, validateFacebookUrl, validateThreadsUrl, validateTwitterUrl} from '../../../src/utils/socialUrls/index';

describe('socialUrls', () => {
    describe('Facebook URL validation', () => {
        it('should return empty string when input is empty', () => {
            assert.equal(validateFacebookUrl(''), '');
        });

        it('should format various Facebook URL formats correctly', () => {
            assert.equal(validateFacebookUrl('facebook.com/myPage'), 'https://www.facebook.com/myPage');
            assert.equal(validateFacebookUrl('https://www.facebook.com/myPage'), 'https://www.facebook.com/myPage');
            assert.equal(validateFacebookUrl('www.facebook.com/myPage'), 'https://www.facebook.com/myPage');
            assert.equal(validateFacebookUrl('/myPage'), 'https://www.facebook.com/myPage');
        });

        it('should reject URLs from other domains', () => {
            assert.throws(() => validateFacebookUrl('https://twitter.com/myPage'), /The URL must be in a format like https:\/\/www\.facebook\.com\/yourPage/);
            assert.throws(() => validateFacebookUrl('http://example.com'), /The URL must be in a format like https:\/\/www\.facebook\.com\/yourPage/);
        });
    });

    describe('Twitter URL validation', () => {
        it('should return empty string when input is empty', () => {
            assert.equal(validateTwitterUrl(''), '');
        });

        it('should format various Twitter URL formats correctly', () => {
            assert.equal(validateTwitterUrl('x.com/username'), 'https://x.com/username');
            assert.equal(validateTwitterUrl('https://x.com/username'), 'https://x.com/username');
            assert.equal(validateTwitterUrl('@username'), 'https://x.com/username');
        });

        it('should reject invalid Twitter usernames', () => {
            assert.throws(() => validateTwitterUrl('x.com/username@'), /Your Username is not a valid Twitter Username/);
            assert.throws(() => validateTwitterUrl('x.com/username!'), /Your Username is not a valid Twitter Username/);
            assert.throws(() => validateTwitterUrl('x.com/thisusernameistoolong'), /Your Username is not a valid Twitter Username/);
        });
    });

    describe('Social media handle to URL conversion', () => {
        it('should convert Facebook handle to full URL', () => {
            assert.equal(facebookHandleToUrl('myPage'), 'https://www.facebook.com/myPage');
        });

        it('should convert Twitter handle to full URL', () => {
            assert.equal(twitterHandleToUrl('@username'), 'https://x.com/username');
            assert.equal(twitterHandleToUrl('username'), 'https://x.com/username');
        });

        it('should convert Threads handle to full URL', () => {
            assert.equal(threadsHandleToUrl('@example123'), 'https://www.threads.net/@example123');
        });
    });

    describe('URL to social media handle extraction', () => {
        it('should extract Facebook handle from URL', () => {
            assert.equal(facebookUrlToHandle('https://www.facebook.com/myPage'), 'myPage');
            assert.equal(facebookUrlToHandle('https://www.facebook.com/myPage/'), 'myPage/');
            assert.equal(facebookUrlToHandle('invalid-url'), null);
        });

        it('should extract Twitter handle from URL', () => {
            assert.equal(twitterUrlToHandle('https://x.com/username'), '@username');
            assert.equal(twitterUrlToHandle('https://x.com/@username'), '@username');
            assert.equal(twitterUrlToHandle('invalid-url'), null);
        });

        it('should extract Threads handle from URL', () => {
            assert.equal(threadsUrlToHandle('https://www.threads.net/@example123'), '@example123');
            assert.equal(threadsUrlToHandle('https://threads.net/@example123'), '@example123');
            assert.equal(threadsUrlToHandle('invalid-url'), null);
        });
    });

    describe('Threads URL validation', () => {
        it('should return empty string when input is empty', () => {
            assert.equal(validateThreadsUrl(''), '');
        });

        it('should transform handle to URL', () => {
            assert.equal(validateThreadsUrl('@example123'), 'https://www.threads.net/@example123');
        });

        it('should format various Threads URL formats correctly', () => {
            assert.equal(validateThreadsUrl('https://www.threads.net/@example123'), 'https://www.threads.net/@example123');
            assert.equal(validateThreadsUrl('https://www.threads.com/@example123'), 'https://www.threads.net/@example123');
            assert.equal(validateThreadsUrl('https://threads.net/@example123'), 'https://www.threads.net/@example123');
        });

        it('should reject invalid Threads URLs', () => {
            assert.throws(() => validateThreadsUrl('https://www.notthreads.com'), /The URL must be in a format like https:\/\/www\.threads\.net\/@yourUsername/);
            assert.throws(() => validateThreadsUrl('https://www.threeeds.com/example123'), /The URL must be in a format like https:\/\/www\.threads\.net\/@yourUsername/);
        });
    });

    describe('Bluesky URL validation', () => {
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

    describe('Bluesky handle to URL conversion', () => {
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

    describe('URL to Bluesky handle extraction', () => {
        it('should extract Bluesky handle from URL', () => {
            assert.equal(blueskyUrlToHandle('https://bsky.app/profile/username'), '@username');
            assert.equal(blueskyUrlToHandle('https://bsky.app/profile/@username'), '@username');
            assert.equal(blueskyUrlToHandle('bsky.app/profile/username'), '@username');
        });

        it('should return null for invalid Bluesky URLs', () => {
            assert.equal(blueskyUrlToHandle('https://example.com/username'), null);
            assert.equal(blueskyUrlToHandle('invalid-url'), null);
        });
    });
});
