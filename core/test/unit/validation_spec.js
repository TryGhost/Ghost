var should     = require('should'),
    sinon      = require('sinon'),

    errors     = require('../../server/errors'),
    validation = require('../../server/data/validation'),

    sandbox    = sinon.sandbox.create();

// Validate our customisations
describe('Validation', function () {
    afterEach(function () {
        sandbox.restore();
    });

    it('should export our required functions', function () {
        should.exist(validation);

        validation.should.have.properties(
            ['validate', 'validator', 'validateSchema', 'validateSettings', 'validateActiveTheme']
        );

        validation.validate.should.be.a.Function();
        validation.validateSchema.should.be.a.Function();
        validation.validateSettings.should.be.a.Function();
        validation.validateActiveTheme.should.be.a.Function();

        validation.validator.should.have.properties(['empty', 'notContains', 'isTimezone', 'isEmptyOrURL', 'isSlug']);
    });

    describe('validateActiveTheme', function () {
        it('should reject theme that is not installed', function (done) {
            validation.validateActiveTheme('theme-that-does-not-exist')
                .then(function () {
                    done(new Error('Activating missing theme is not rejected.'));
                }).catch(function (error) {
                    error.should.have.property('errorType', 'ValidationError');
                    done();
                }).catch(done);
        });

        it('should show warning instead of the rejection when showWarning option is used', function (done) {
            var warnSpy = sinon.stub(errors, 'logWarn');

            validation.validateActiveTheme('theme-that-does-not-exist', {showWarning: true})
                .then(function () {
                    warnSpy.called.should.be.true();
                    warnSpy.calledWith('The currently active theme "theme-that-does-not-exist" is missing.').should.be.true();
                    done();
                }).catch(done);
        });
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
