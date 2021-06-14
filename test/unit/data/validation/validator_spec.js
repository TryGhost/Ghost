const should = require('should');

const validation = require('../../../../core/server/data/validation');

describe('Validator dependency', function () {
    const validator = validation.validator;

    it('isEmptyOrUrl filters javascript urls', function () {
        validator.isEmptyOrURL('javascript:alert(0)').should.be.false();
        validator.isEmptyOrURL('http://example.com/lol/<script>lalala</script>/').should.be.false();
        validator.isEmptyOrURL('http://example.com/lol?somequery=<script>lalala</script>').should.be.false();
        validator.isEmptyOrURL('').should.be.true();
        validator.isEmptyOrURL('http://localhost:2368').should.be.true();
        validator.isEmptyOrURL('http://example.com/test/').should.be.true();
        validator.isEmptyOrURL('http://www.example.com/test/').should.be.true();
        validator.isEmptyOrURL('http://example.com/foo?somequery=bar').should.be.true();
        validator.isEmptyOrURL('example.com/test/').should.be.true();
    });
});
