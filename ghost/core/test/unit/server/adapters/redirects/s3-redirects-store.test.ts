import assert from 'node:assert/strict';

import S3RedirectsStore from '../../../../../core/server/adapters/redirects/S3RedirectsStore';

describe('UNIT: S3RedirectsStore', function () {
    describe('constructor validation', function () {
        it('throws when no bucket is provided', function () {
            assert.throws(
                () => new S3RedirectsStore({} as never),
                {errorType: 'IncorrectUsageError', message: /bucket/}
            );
        });

        it('throws when no staticFileURLPrefix is provided', function () {
            assert.throws(
                () => new S3RedirectsStore({bucket: 'x'} as never),
                {errorType: 'IncorrectUsageError', message: /staticFileURLPrefix/}
            );
        });

        it('throws when only accessKeyId is provided', function () {
            assert.throws(
                () => new S3RedirectsStore({bucket: 'x', staticFileURLPrefix: 'content/data', accessKeyId: 'AKIA'}),
                {errorType: 'IncorrectUsageError', message: /accessKeyId.*secretAccessKey/}
            );
        });

        it('throws when only secretAccessKey is provided', function () {
            assert.throws(
                () => new S3RedirectsStore({bucket: 'x', staticFileURLPrefix: 'content/data', secretAccessKey: 'shh'}),
                {errorType: 'IncorrectUsageError', message: /accessKeyId.*secretAccessKey/}
            );
        });

        it('throws when sessionToken is provided without the credential pair', function () {
            assert.throws(
                () => new S3RedirectsStore({bucket: 'x', staticFileURLPrefix: 'content/data', sessionToken: 'session'}),
                {errorType: 'IncorrectUsageError', message: /accessKeyId.*secretAccessKey/}
            );
        });

        it('accepts a tenantPrefix without throwing', function () {
            assert.doesNotThrow(() => new S3RedirectsStore({bucket: 'x', staticFileURLPrefix: 'content/data', tenantPrefix: 'tenant-abc'}));
        });
    });
});
