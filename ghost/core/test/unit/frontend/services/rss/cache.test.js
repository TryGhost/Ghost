const assert = require('node:assert/strict');
const sinon = require('sinon');
const rewire = require('rewire');
const configUtils = require('../../../../utils/config-utils');
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

    it('should not rebuild xml for same data and url', async function () {
        const data = {
            title: 'Test Title',
            description: 'Testing Desc',
            posts: [],
            meta: {pagination: {pages: 1}}
        };
        let xmlData1;

        const _xmlData = await rssCache.getXML('/rss/', data);

        xmlData1 = _xmlData;

        // We should have called generateFeed
        sinon.assert.calledOnce(generateSpy);

        // Call RSS again to check that we didn't rebuild
        const xmlData2 = await rssCache.getXML('/rss/', data);

        // Assertions

        // We should not have called generateFeed again
        sinon.assert.calledOnce(generateSpy);

        // The data should be identical, no changing lastBuildDate
        assert.equal(xmlData1, xmlData2);
    });
});
