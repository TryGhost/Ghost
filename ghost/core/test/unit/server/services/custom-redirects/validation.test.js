const assert = require('node:assert/strict');

const {validate} = require('../../../../../core/server/services/custom-redirects/validation');

describe('UNIT: custom redirects validation', function () {
    it('passes validation for a valid redirects config', function () {
        const config = [{
            permanent: true,
            from: '/test-params',
            to: '/result?q=abc'
        }];

        validate(config);
    });

    it('throws for an invalid redirects config format missing from parameter', function () {
        const config = [{
            permanent: true,
            to: '/'
        }];

        assert.throws(() => {
            validate(/** @type {any} */ (config));
        }, {message: 'Incorrect redirects file format.'});
    });

    it('throws for an invalid redirects config having invalid RegExp in from field', function () {
        const config = [{
            permanent: true,
            from: '/invalid_regex/(/size/[a-zA-Z0-9_-.]*/[a-zA-Z0-9_-.]*/[0-9]*/[0-9]*/)([a-zA-Z0-9_-.]*)',
            to: '/'
        }];

        assert.throws(() => {
            validate(config);
        }, {message: 'Incorrect RegEx in redirects file.'});
    });

    it('throws when setting a file with wrong format: no array', function () {
        const config = {
            from: 'c',
            to: 'd'
        };

        assert.throws(() => {
            validate(/** @type {any} */ (config));
        }, {message: 'Incorrect redirects file format.'});
    });

    it('throws when from is not a string', function () {
        // RegExp coerces an object to "[object Object]" so without an
        // explicit type check this would silently pass validation.
        assert.throws(() => {
            validate(/** @type {any} */ ([{from: {}, to: '/x'}]));
        }, {message: 'Incorrect redirects file format.'});
    });

    it('throws when to is not a string', function () {
        assert.throws(() => {
            validate(/** @type {any} */ ([{from: '/a', to: {nested: '/b'}}]));
        }, {message: 'Incorrect redirects file format.'});
    });

    it('throws when from is a whitespace-only string', function () {
        assert.throws(() => {
            validate(/** @type {any} */ ([{from: '   ', to: '/x'}]));
        }, {message: 'Incorrect redirects file format.'});
    });

    it('throws ValidationError (not TypeError) when an entry is null', function () {
        assert.throws(() => {
            validate(/** @type {any} */ ([null]));
        }, {message: 'Incorrect redirects file format.'});
    });

    it('throws ValidationError when an entry is a primitive', function () {
        assert.throws(() => {
            validate(/** @type {any} */ (['a string entry']));
        }, {message: 'Incorrect redirects file format.'});
    });
});
