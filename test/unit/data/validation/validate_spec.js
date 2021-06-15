const should = require('should');

const validation = require('../../../../core/server/data/validation');

// Validate our customizations
describe('Validation', function () {
    it('should export our required functions', function () {
        should.exist(validation);

        validation.should.have.properties(
            ['validate', 'validator']
        );

        validation.validate.should.be.a.Function();
    });
});
