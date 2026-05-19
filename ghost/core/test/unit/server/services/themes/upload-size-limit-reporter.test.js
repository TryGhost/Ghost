const assert = require('node:assert/strict');
const sinon = require('sinon');
const errors = require('@tryghost/errors');
const logging = require('@tryghost/logging');
const sentry = require('../../../../../core/shared/sentry');
const {
    isThemeUploadSizeLimitError,
    reportThemeUploadSizeLimitError
} = require('../../../../../core/server/services/themes/upload-size-limit-reporter');

describe('Theme upload size limit reporter', function () {
    afterEach(function () {
        sinon.restore();
    });

    it('identifies supported theme upload size limit errors', function () {
        const err = new errors.UnsupportedMediaTypeError({
            code: 'ENTRY_TOO_LARGE'
        });

        assert.equal(isThemeUploadSizeLimitError(err), true);
        assert.equal(isThemeUploadSizeLimitError(new errors.UnsupportedMediaTypeError({
            code: 'SYMLINK_NOT_ALLOWED'
        })), false);
        assert.equal(isThemeUploadSizeLimitError(new Error('nope')), false);
    });

    it('logs and reports size limit errors to Sentry', function () {
        const loggingStub = sinon.stub(logging, 'error');
        const sentryStub = sinon.stub(sentry, 'captureException');
        const err = new errors.UnsupportedMediaTypeError({
            message: 'Zip entry exceeds maximum uncompressed size.',
            context: 'The zip contains an entry that exceeds the maximum uncompressed size.',
            code: 'ENTRY_TOO_LARGE',
            errorDetails: {
                entryName: 'assets/big.jpg',
                observedBytes: 101,
                limitBytes: 100
            }
        });

        reportThemeUploadSizeLimitError(err, {
            themeName: 'large-theme',
            zip: {size: 42}
        });

        sinon.assert.calledOnce(loggingStub);
        sinon.assert.calledWith(loggingStub, {
            system: {
                event: 'theme_upload.entry_too_large',
                theme_name: 'large-theme',
                entry_name: 'assets/big.jpg',
                observed_bytes: 101,
                limit_bytes: 100,
                compressed_size_bytes: 42
            },
            err
        }, '[theme-upload] Zip entry exceeds maximum uncompressed size.');

        sinon.assert.calledOnceWithExactly(sentryStub, err, {
            tags: {source: 'theme_upload.entry_too_large'},
            extra: {
                theme_name: 'large-theme',
                entry_name: 'assets/big.jpg',
                observed_bytes: 101,
                limit_bytes: 100,
                compressed_size_bytes: 42
            }
        });
    });
});
