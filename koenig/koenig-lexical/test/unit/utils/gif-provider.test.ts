import {describe, expect, test} from 'vitest';
import {extractErrorMessage, getGifProviderConfig, isInvalidKeyError} from '../../../src/utils/services/gif.js';

describe('Utils: getGifProviderConfig', () => {
    test('returns null when Klipy is not configured', () => {
        expect(getGifProviderConfig(undefined)).toBeNull();
        expect(getGifProviderConfig({})).toBeNull();
        expect(getGifProviderConfig({klipy: null})).toBeNull();
    });

    test('returns null when the Klipy config is present but has no key', () => {
        expect(getGifProviderConfig({klipy: {}})).toBeNull();
        expect(getGifProviderConfig({klipy: {apiKey: ''}})).toBeNull();
    });

    test('resolves Klipy when configured', () => {
        const config = getGifProviderConfig({klipy: {apiKey: 'klipy-key'}});

        expect(config).toEqual({
            apiUrl: 'https://api.klipy.com',
            apiKey: 'klipy-key',
            contentFilter: 'off'
        });
    });

    test('passes through a configured content filter', () => {
        expect(getGifProviderConfig({klipy: {apiKey: 'k', contentFilter: 'low'}}).contentFilter).toEqual('low');
    });
});

describe('Utils: extractErrorMessage', () => {
    test('reads the Klipy error shape', () => {
        expect(extractErrorMessage({result: false, errors: {message: ['The provided API key is invalid']}})).toEqual('The provided API key is invalid');
    });

    test('reads a Klipy error message that is not wrapped in an array', () => {
        expect(extractErrorMessage({result: false, errors: {message: 'Rate limit exceeded'}})).toEqual('Rate limit exceeded');
    });

    test('falls back to a generic message when the shape is unknown', () => {
        expect(extractErrorMessage({})).toEqual('Unknown error');
    });
});

describe('Utils: isInvalidKeyError', () => {
    test('detects the Klipy invalid-key wording', () => {
        expect(isInvalidKeyError('The provided API key is invalid: [xxx]')).toBe(true);
    });

    test('returns false for a non-key error', () => {
        expect(isInvalidKeyError('Trouble reaching the GIF service')).toBe(false);
    });

    test('returns false for an empty or missing message', () => {
        expect(isInvalidKeyError('')).toBe(false);
        expect(isInvalidKeyError(undefined)).toBe(false);
    });
});
