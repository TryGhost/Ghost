const should = require('should');
const optionsUtil = require('../../../../../core/server/api/shared/utils/options');

describe('Unit: api/shared/util/options', function () {
    it('returns an array with empty string when no parameters are passed', function () {
        optionsUtil.trimAndLowerCase().should.eql(['']);
    });

    it('returns single item array', function () {
        optionsUtil.trimAndLowerCase('butter').should.eql(['butter']);
    });

    it('returns multiple items in array', function () {
        optionsUtil.trimAndLowerCase('peanut, butter').should.eql(['peanut', 'butter']);
    });

    it('lowercases and trims items in the string', function () {
        optionsUtil.trimAndLowerCase('  PeanUt, buTTer ').should.eql(['peanut', 'butter']);
    });

    it('accepts parameters in form of an array', function () {
        optionsUtil.trimAndLowerCase(['  PeanUt', ' buTTer ']).should.eql(['peanut', 'butter']);
    });
});
