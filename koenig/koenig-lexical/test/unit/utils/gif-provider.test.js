import {describe, expect, test} from 'vitest';
import {extractErrorMessage, getGifProviderConfig} from '../../../src/utils/services/gif.js';

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

    test('falls back to a generic message when the shape is unknown', () => {
        expect(extractErrorMessage({})).toEqual('Unknown error');
    });
});
