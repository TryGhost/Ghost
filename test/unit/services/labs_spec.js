const should = require('should');
const sinon = require('sinon');
const settingsCache = require('../../../core/server/services/settings/cache');

const labs = require('../../../core/server/services/labs');

describe('Labs Service', function () {
    let labsCacheStub;

    beforeEach(function () {
        labsCacheStub = sinon.stub(settingsCache, 'get').withArgs('labs');
    });

    afterEach(function () {
        sinon.restore();
    });

    it('can getAll, even if empty', function () {
        labs.getAll().should.eql({});
    });

    it('can getAll from cache', function () {
        labsCacheStub.returns({members: true, foo: 'bar'});

        labs.getAll().should.eql({members: true, foo: 'bar'});
    });

    it('can getAll from cache, ignoring deprecated', function () {
        labsCacheStub.returns({members: true, foo: 'bar', subscribers: false, publicAPI: true});

        labs.getAll().should.eql({members: true, foo: 'bar'});
    });

    it('isSet returns true string flag', function () {
        labsCacheStub.returns({foo: 'bar'});

        labs.isSet('foo').should.be.true;
    });

    it('isSet returns false for undefined', function () {
        labsCacheStub.returns({foo: 'bar'});

        labs.isSet('bar').should.be.false;
    });

    it('isSet always returns false for deprecated', function () {
        labsCacheStub.returns({subscribers: true, publicAPI: true});

        labs.isSet('subscribers').should.be.false;
        labs.isSet('publicAPI').should.be.false;
    });
});
