const should = require('should');

const validation = require('../../../../core/server/data/validation');

// Validate our customizations
describe('Validation', function () {
    it('should export our required functions', function () {
        should.exist(validation);

        validation.should.have.properties(
            ['validate', 'validator', 'validateSchema', 'validatePassword']
        );

        validation.validate.should.be.a.Function();
        validation.validatePassword.should.be.a.Function();
        validation.validateSchema.should.be.a.Function();

        validation.validator.should.have.properties(['empty', 'notContains', 'isTimezone', 'isEmptyOrURL', 'isSlug']);
    });
});
