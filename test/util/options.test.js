const assert = require('node:assert/strict');
const optionsUtil = require('../../lib/utils/options');

describe('util/options', function () {
    it('returns an array with empty string when no parameters are passed', function () {
        assert.deepEqual(optionsUtil.trimAndLowerCase(), ['']);
    });

    it('returns single item array', function () {
        assert.deepEqual(optionsUtil.trimAndLowerCase('butter'), ['butter']);
    });

    it('returns multiple items in array', function () {
        assert.deepEqual(optionsUtil.trimAndLowerCase('peanut, butter'), ['peanut', 'butter']);
    });

    it('lowercases and trims items in the string', function () {
        assert.deepEqual(optionsUtil.trimAndLowerCase('  PeanUt, buTTer '), ['peanut', 'butter']);
    });

    it('accepts parameters in form of an array', function () {
        assert.deepEqual(optionsUtil.trimAndLowerCase(['  PeanUt', ' buTTer ']), ['peanut', 'butter']);
    });

    it('throws error for invalid object input', function () {
        assert.throws(() => optionsUtil.trimAndLowerCase({name: 'peanut'}), {
            message: 'Params must be a string or array'
        });
    });
});
