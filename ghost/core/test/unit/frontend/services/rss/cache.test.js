const should = require('should');
const sinon = require('sinon');
const rewire = require('rewire');
const configUtils = require('../../../../utils/configUtils');
const rssCache = rewire('../../../../../core/frontend/services/rss/cache');

describe('RSS: Cache', function () {
    let generateSpy;
    let generateFeedReset;

    afterEach(async function () {
        await configUtils.restore();
        sinon.restore();
        generateFeedReset();
    });

    beforeEach(function () {
        configUtils.set({url: 'http://my-ghost-blog.com'});

        generateSpy = sinon.spy(rssCache.__get__('generateFeed'));
        generateFeedReset = rssCache.__set__('generateFeed', generateSpy);
    });

    it('should not rebuild xml for same data and url', function (done) {
        const data = {
            title: 'Test Title',
            description: 'Testing Desc',
            posts: [],
            meta: {pagination: {pages: 1}}
        };
        let xmlData1;

        rssCache.getXML('/rss/', data)
            .then(function (_xmlData) {
                xmlData1 = _xmlData;

                // We should have called generateFeed
                generateSpy.callCount.should.eql(1);

                // Call RSS again to check that we didn't rebuild
                return rssCache.getXML('/rss/', data);
            })
            .then(function (xmlData2) {
                // Assertions

                // We should not have called generateFeed again
                generateSpy.callCount.should.eql(1);

                // The data should be identical, no changing lastBuildDate
                xmlData1.should.equal(xmlData2);

                done();
            })
            .catch(done);
    });
});
