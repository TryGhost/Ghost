import * as assert from 'assert/strict';
import {threadsHandleToUrl, threadsUrlToHandle, validateThreadsUrl} from '../../../src/utils/socialUrls/index';

describe('Threads URLs', () => {
    describe('URL validation', () => {
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

    describe('Handle to URL conversion', () => {
        it('should convert Threads handle to full URL', () => {
            assert.equal(threadsHandleToUrl('@example123'), 'https://www.threads.net/@example123');
        });
    });

    describe('URL to handle extraction', () => {
        it('should extract Threads handle from URL', () => {
            assert.equal(threadsUrlToHandle('https://www.threads.net/@example123'), '@example123');
            assert.equal(threadsUrlToHandle('https://threads.net/@example123'), '@example123');
            assert.equal(threadsUrlToHandle('invalid-url'), null);
        });
    });
}); 