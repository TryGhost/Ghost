import {describe, expect, it} from 'vitest';
import {deferred} from './deferred';

describe('deferred', () => {
    it('returns a promise with externally accessible resolve and reject functions', () => {
        const d = deferred<string>();

        expect(d.promise).toBeInstanceOf(Promise);
        expect(typeof d.resolve).toBe('function');
        expect(typeof d.reject).toBe('function');
    });

    it('resolve function resolves the promise', async () => {
        const d = deferred<string>();

        d.resolve('test value');

        await expect(d.promise).resolves.toBe('test value');
    });

    it('reject function rejects the promise', async () => {
        const d = deferred<string>();

        d.reject(new Error('test error'));

        await expect(d.promise).rejects.toThrow('test error');
    });
});
