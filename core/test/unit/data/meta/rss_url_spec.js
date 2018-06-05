const should = require('should'),
    sinon = require('sinon'),
    sandbox = sinon.sandbox.create(),
    routing = require('../../../../server/services/routing'),
    getRssUrl = require('../../../../server/data/meta/rss_url');

describe('getRssUrl', function () {
    let firstCollection;

    beforeEach(function () {
        sandbox.restore();

        firstCollection = sandbox.stub();
        firstCollection.getRssUrl = sandbox.stub().returns('/rss/');

        sandbox.stub(routing.registry, 'getFirstCollectionRouter').returns(firstCollection);
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

        firstCollection.getRssUrl.calledWith({secure: false, absolute: true}).should.be.true();
    });
});
