import {describe, it} from 'vitest';
import {expect} from 'vitest';
import {threadsHandleToUrl, threadsUrlToHandle, validateThreadsUrl} from '../../../src/utils/socialUrls/index';

describe('Threads URLs', () => {
    describe('URL validation', () => {
        it('should return empty string when input is empty', () => {
            expect(validateThreadsUrl('')).toBe('');
        });

        it('should transform handle to URL', () => {
            expect(validateThreadsUrl('@example123')).toBe('https://www.threads.net/@example123');
        });

        it('should format various Threads URL formats correctly', () => {
            expect(validateThreadsUrl('https://www.threads.net/@example123')).toBe('https://www.threads.net/@example123');
            expect(validateThreadsUrl('https://www.threads.com/@example123')).toBe('https://www.threads.net/@example123');
            expect(validateThreadsUrl('https://threads.net/@example123')).toBe('https://www.threads.net/@example123');
        });

        it('should reject invalid Threads URLs', () => {
            expect(() => validateThreadsUrl('https://www.notthreads.com')).toThrow(/The URL must be in a format like https:\/\/www\.threads\.net\/@yourUsername/);
            expect(() => validateThreadsUrl('https://www.threeeds.com/example123')).toThrow(/The URL must be in a format like https:\/\/www\.threads\.net\/@yourUsername/);
        });
    });

    describe('Handle to URL conversion', () => {
        it('should convert Threads handle to full URL', () => {
            expect(threadsHandleToUrl('@example123')).toBe('https://www.threads.net/@example123');
        });
    });

    describe('URL to handle extraction', () => {
        it('should extract Threads handle from URL', () => {
            expect(threadsUrlToHandle('https://www.threads.net/@example123')).toBe('@example123');
            expect(threadsUrlToHandle('https://threads.net/@example123')).toBe('@example123');
            expect(threadsUrlToHandle('invalid-url')).toBe(null);
        });
    });
}); 