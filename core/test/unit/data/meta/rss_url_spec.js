const should = require('should'),
    sinon = require('sinon'),
    sandbox = sinon.sandbox.create(),
    routing = require('../../../../server/services/routing'),
    getRssUrl = require('../../../../server/data/meta/rss_url');

describe('getRssUrl', function () {
    beforeEach(function () {
        sandbox.restore();
        sandbox.stub(routing.registry, 'getRssUrl').returns('/rss/');
    });

    it('should return rss url', function () {
        const rssUrl = getRssUrl({
            secure: false
        });

        should.equal(rssUrl, '/rss/');
    });

    it('forwards absolute/secure flags', function () {
        const rssUrl = getRssUrl({
            secure: false
        }, true);

        routing.registry.getRssUrl.calledWith({secure: false, absolute: true}).should.be.true();
    });
});
