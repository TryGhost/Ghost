import assert from 'node:assert/strict';

import GCSStore from '../../../../../core/server/adapters/redirects/GCSStore';

describe('UNIT: GCSStore', function () {
    describe('constructor validation', function () {
        it('throws when no bucket is provided', function () {
            assert.throws(
                () => new GCSStore({} as never),
                {errorType: 'IncorrectUsageError', message: /bucket/}
            );
        });

        it('throws when only accessKeyId is provided', function () {
            assert.throws(
                () => new GCSStore({bucket: 'x', accessKeyId: 'AKIA'}),
                {errorType: 'IncorrectUsageError', message: /accessKeyId.*secretAccessKey/}
            );
        });

        it('throws when only secretAccessKey is provided', function () {
            assert.throws(
                () => new GCSStore({bucket: 'x', secretAccessKey: 'shh'}),
                {errorType: 'IncorrectUsageError', message: /accessKeyId.*secretAccessKey/}
            );
        });

        it('throws when sessionToken is provided without the credential pair', function () {
            assert.throws(
                () => new GCSStore({bucket: 'x', sessionToken: 'session'}),
                {errorType: 'IncorrectUsageError', message: /accessKeyId.*secretAccessKey/}
            );
        });
    });
});
