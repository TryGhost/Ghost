const should = require('should');

const validator = require('../../../../core/server/data/validator');

// Validate our customizations
describe('Validate', function () {
    it('should export our required functions', function () {
        should.exist(validator);

        validator.should.have.properties(
            ['validate']
        );

        validator.validate.should.be.a.Function();
    });
});
