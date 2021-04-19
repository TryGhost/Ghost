const should = require('should');
const sinon = require('sinon');

const labs = require('../../../core/server/services/labs');
const settingsCache = require('../../../core/server/services/settings/cache');

describe('Labs Service', function () {
    afterEach(function () {
        sinon.restore();
    });

    it('members flag is true when members_signup_access setting is "all"', function () {
        sinon.stub(settingsCache, 'get');
        settingsCache.get.withArgs('members_signup_access').returns('all');

        labs.getAll().should.eql({
            members: true
        });

        labs.isSet('members').should.be.true;
    });

    it('members flag is false when members_signup_access setting is "none"', function () {
        sinon.stub(settingsCache, 'get');
        settingsCache.get.withArgs('members_signup_access').returns('none');

        labs.getAll().should.eql({
            members: false
        });

        labs.isSet('members').should.be.false;
    });

    it('isSet returns false for undefined', function () {
        labs.isSet('bar').should.be.false;
    });

    it('isSet always returns false for deprecated', function () {
        labs.isSet('subscribers').should.be.false;
        labs.isSet('publicAPI').should.be.false;
    });
});
