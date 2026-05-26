const assert = require('node:assert/strict');
const errors = require('@tryghost/errors');
const {formatImportErrorMessage, formatImportFailureDetailsHtml, throwImportErrors} = require('../../../../../core/server/data/importer/import-errors');

describe('import-errors', function () {
    describe('formatImportErrorMessage', function () {
        it('includes the entry email when context is present', function () {
            const err = new errors.ValidationError({
                message: 'Value in [users.email] is not a valid email.',
                context: JSON.stringify({email: 'not-an-email', slug: 'author-1'})
            });

            assert.equal(
                formatImportErrorMessage(err),
                'not-an-email: Value in [users.email] is not a valid email.'
            );
        });

        it('falls back to the error message when context is missing', function () {
            const err = new errors.DataImportError({
                message: 'Detected duplicated entry.'
            });

            assert.equal(formatImportErrorMessage(err), 'Detected duplicated entry.');
        });
    });

    describe('throwImportErrors', function () {
        it('throws a DataImportError instead of rejecting with an array', function () {
            const validationError = new errors.ValidationError({
                message: 'Value in [users.bio] exceeds maximum length of 250 characters.',
                context: JSON.stringify({email: 'author@example.com'})
            });

            assert.throws(
                () => throwImportErrors([validationError]),
                (err) => {
                    assert.equal(err.name, 'DataImportError');
                    assert.match(err.message, /author@example.com/);
                    assert.match(err.message, /maximum length of 250 characters/);
                    return true;
                }
            );
        });

        it('summarizes multiple import errors in one message', function () {
            const first = new errors.ValidationError({
                message: 'First validation error.',
                context: JSON.stringify({email: 'one@example.com'})
            });
            const second = new errors.ValidationError({
                message: 'Second validation error.',
                context: JSON.stringify({email: 'two@example.com'})
            });

            assert.throws(
                () => throwImportErrors([first, second]),
                (err) => {
                    assert.equal(err.name, 'DataImportError');
                    assert.match(err.message, /Import failed with 2 errors/);
                    assert.match(err.message, /one@example.com/);
                    assert.match(err.message, /two@example.com/);
                    return true;
                }
            );
        });
    });
});
