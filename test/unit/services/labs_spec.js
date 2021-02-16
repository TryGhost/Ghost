const should = require('should');
const sinon = require('sinon');

const labs = require('../../../core/server/services/labs');

describe('Labs Service', function () {
    afterEach(function () {
        sinon.restore();
    });

    it('always returns members true flag', function () {
        labs.getAll().should.eql({
            members: true
        });

        labs.isSet('members').should.be.true;
    });

    it('isSet returns false for undefined', function () {
        labs.isSet('bar').should.be.false;
    });

    it('isSet always returns false for deprecated', function () {
        labs.isSet('subscribers').should.be.false;
        labs.isSet('publicAPI').should.be.false;
    });
});
