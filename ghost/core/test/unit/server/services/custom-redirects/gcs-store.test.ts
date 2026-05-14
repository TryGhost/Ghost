import assert from 'node:assert/strict';

import {GCSStore} from '../../../../../core/server/services/custom-redirects/gcs-store';

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
                () => new GCSStore({bucket: 'x', accessKeyId: 'a'}),
                {errorType: 'IncorrectUsageError', message: /accessKeyId and secretAccessKey/}
            );
        });

        it('throws when only secretAccessKey is provided', function () {
            assert.throws(
                () => new GCSStore({bucket: 'x', secretAccessKey: 's'}),
                {errorType: 'IncorrectUsageError', message: /accessKeyId and secretAccessKey/}
            );
        });
    });
});
