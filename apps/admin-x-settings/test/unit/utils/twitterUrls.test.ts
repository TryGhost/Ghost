import * as assert from 'assert/strict';
import {twitterHandleToUrl, twitterUrlToHandle, validateTwitterUrl} from '../../../src/utils/socialUrls/index';

describe('Twitter URLs', () => {
    describe('URL validation', () => {
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

    describe('Handle to URL conversion', () => {
        it('should convert Twitter handle to full URL', () => {
            assert.equal(twitterHandleToUrl('@username'), 'https://x.com/username');
            assert.equal(twitterHandleToUrl('username'), 'https://x.com/username');
        });
    });

    describe('URL to handle extraction', () => {
        it('should extract Twitter handle from URL', () => {
            assert.equal(twitterUrlToHandle('https://x.com/username'), '@username');
            assert.equal(twitterUrlToHandle('https://x.com/@username'), '@username');
            assert.equal(twitterUrlToHandle('invalid-url'), null);
        });
    });
}); 