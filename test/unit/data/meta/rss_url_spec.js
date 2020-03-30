const should = require('should'),
    sinon = require('sinon'),
    routing = require('../../../../core/frontend/services/routing'),
    getRssUrl = require('../../../../core/frontend/meta/rss_url');

describe('getRssUrl', function () {
    beforeEach(function () {
        sinon.stub(routing.registry, 'getRssUrl').returns('/rss/');
    });

    afterEach(function () {
        sinon.restore();
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
