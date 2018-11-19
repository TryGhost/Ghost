const should = require('should');
const optionsUtil = require('../../../../../server/api/shared/utils/options');

describe('Unit: api/shared/util/options', () => {
    it('returns an array with empty string when no parameters are passed', () => {
        optionsUtil.trimAndLowerCase().should.eql(['']);
    });

    it('returns single item array', () => {
        optionsUtil.trimAndLowerCase('butter').should.eql(['butter']);
    });

    it('returns multiple items in array', () => {
        optionsUtil.trimAndLowerCase('peanut, butter').should.eql(['peanut', 'butter']);
    });

    it('lowercases and trims items in the string', () => {
        optionsUtil.trimAndLowerCase('  PeanUt, buTTer ').should.eql(['peanut', 'butter']);
    });

    it('accepts parameters in form of an array', () => {
        optionsUtil.trimAndLowerCase(['  PeanUt', ' buTTer ']).should.eql(['peanut', 'butter']);
    });
});
