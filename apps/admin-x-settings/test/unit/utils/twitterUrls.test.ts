import {describe, it} from 'vitest';
import {expect} from 'vitest';
import {twitterHandleToUrl, twitterUrlToHandle, validateTwitterUrl} from '../../../src/utils/socialUrls/index';

describe('Twitter URLs', () => {
    describe('URL validation', () => {
        it('should return empty string when input is empty', () => {
            expect(validateTwitterUrl('')).toBe('');
        });

        it('should format various Twitter URL formats correctly', () => {
            expect(validateTwitterUrl('x.com/username')).toBe('https://x.com/username');
            expect(validateTwitterUrl('https://x.com/username')).toBe('https://x.com/username');
            expect(validateTwitterUrl('@username')).toBe('https://x.com/username');
        });

        it('should reject invalid Twitter usernames', () => {
            expect(() => validateTwitterUrl('x.com/username@')).toThrow(/Your Username is not a valid Twitter Username/);
            expect(() => validateTwitterUrl('x.com/username!')).toThrow(/Your Username is not a valid Twitter Username/);
            expect(() => validateTwitterUrl('x.com/thisusernameistoolong')).toThrow(/Your Username is not a valid Twitter Username/);
        });
    });

    describe('Handle to URL conversion', () => {
        it('should convert Twitter handle to full URL', () => {
            expect(twitterHandleToUrl('@username')).toBe('https://x.com/username');
            expect(twitterHandleToUrl('username')).toBe('https://x.com/username');
        });
    });

    describe('URL to handle extraction', () => {
        it('should extract Twitter handle from URL', () => {
            expect(twitterUrlToHandle('https://x.com/username')).toBe('@username');
            expect(twitterUrlToHandle('https://x.com/@username')).toBe('@username');
            expect(twitterUrlToHandle('invalid-url')).toBe(null);
        });
    });
}); 