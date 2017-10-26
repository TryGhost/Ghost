var should = require('should'),

    validation = require('../../server/data/validation');

// Validate our customisations
describe('Validation', function () {
    it('should export our required functions', function () {
        should.exist(validation);

        validation.should.have.properties(
            ['validate', 'validator', 'validateSchema', 'validateSettings']
        );

        validation.validate.should.be.a.Function();
        validation.validatePassword.should.be.a.Function();
        validation.validateSchema.should.be.a.Function();
        validation.validateSettings.should.be.a.Function();

        validation.validator.should.have.properties(['empty', 'notContains', 'isTimezone', 'isEmptyOrURL', 'isSlug']);
    });

    describe('Validator customisations', function () {
        var validator = validation.validator;

        it('isEmptyOrUrl filters javascript urls', function () {
            /*jshint scripturl:true */
            validator.isEmptyOrURL('javascript:alert(0)').should.be.false();
            validator.isEmptyOrURL('http://example.com/lol/<script>lalala</script>/').should.be.false();
            validator.isEmptyOrURL('http://example.com/lol?somequery=<script>lalala</script>').should.be.false();
            /*jshint scripturl:false */
            validator.isEmptyOrURL('').should.be.true();
            validator.isEmptyOrURL('http://localhost:2368').should.be.true();
            validator.isEmptyOrURL('http://example.com/test/').should.be.true();
            validator.isEmptyOrURL('http://www.example.com/test/').should.be.true();
            validator.isEmptyOrURL('http://example.com/foo?somequery=bar').should.be.true();
            validator.isEmptyOrURL('example.com/test/').should.be.true();
        });
    });
});
