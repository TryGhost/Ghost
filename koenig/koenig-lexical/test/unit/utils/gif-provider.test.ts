import {describe, expect, test} from 'vitest';
import {extractErrorMessage, getGifProviderConfig, isInvalidKeyError} from '../../../src/utils/services/gif.js';

describe('Utils: getGifProviderConfig', () => {
    test('returns null when neither provider is configured', () => {
        expect(getGifProviderConfig(undefined)).toBeNull();
        expect(getGifProviderConfig({})).toBeNull();
        expect(getGifProviderConfig({tenor: null, klipy: null})).toBeNull();
    });

    test('resolves Tenor when only Tenor is configured', () => {
        const config = getGifProviderConfig({tenor: {googleApiKey: 'tenor-key'}});

        expect(config).toEqual({
            provider: 'tenor',
            apiUrl: 'https://tenor.googleapis.com',
            apiKey: 'tenor-key',
            contentFilter: 'off'
        });
    });

    test('resolves Klipy when only Klipy is configured', () => {
        const config = getGifProviderConfig({klipy: {apiKey: 'klipy-key'}});

        expect(config).toEqual({
            provider: 'klipy',
            apiUrl: 'https://api.klipy.com',
            apiKey: 'klipy-key',
            contentFilter: 'off'
        });
    });

    test('prefers Klipy when both providers are configured', () => {
        const config = getGifProviderConfig({
            tenor: {googleApiKey: 'tenor-key'},
            klipy: {apiKey: 'klipy-key'}
        });

        expect(config.provider).toEqual('klipy');
        expect(config.apiKey).toEqual('klipy-key');
    });

    test('passes through a configured content filter', () => {
        expect(getGifProviderConfig({tenor: {googleApiKey: 'k', contentFilter: 'high'}}).contentFilter).toEqual('high');
        expect(getGifProviderConfig({klipy: {apiKey: 'k', contentFilter: 'low'}}).contentFilter).toEqual('low');
    });

    test('falls back to Tenor when the Klipy config is present but has no key', () => {
        expect(getGifProviderConfig({klipy: {}, tenor: {googleApiKey: 'tenor-key'}}).provider).toEqual('tenor');
        expect(getGifProviderConfig({klipy: {apiKey: ''}, tenor: {googleApiKey: 'tenor-key'}}).provider).toEqual('tenor');
    });
});

describe('Utils: extractErrorMessage', () => {
    test('reads the Tenor error shape', () => {
        expect(extractErrorMessage({error: {message: 'API key not valid'}})).toEqual('API key not valid');
    });

    test('reads a Tenor string error', () => {
        expect(extractErrorMessage({error: 'Something went wrong'})).toEqual('Something went wrong');
    });

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
    test('detects the Tenor invalid-key wording', () => {
        expect(isInvalidKeyError('API key not valid')).toBe(true);
    });

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
