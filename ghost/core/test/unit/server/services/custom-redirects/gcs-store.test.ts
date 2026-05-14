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

        it('throws when no S3 client is provided', function () {
            assert.throws(
                () => new GCSStore({bucket: 'x'} as never),
                {errorType: 'IncorrectUsageError', message: /S3 client/}
            );
        });
    });
});
