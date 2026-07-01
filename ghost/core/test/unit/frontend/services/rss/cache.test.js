const assert = require('node:assert/strict');
const crypto = require('crypto');
const sinon = require('sinon');
const logging = require('@tryghost/logging');
const configUtils = require('../../../../utils/config-utils');
const rssCache = require('../../../../../core/frontend/services/rss/cache');

describe('RSS: Cache', function () {
    let loggingInfoSpy;

    afterEach(async function () {
        await configUtils.restore();
        sinon.restore();
    });

    beforeEach(function () {
        configUtils.set({url: 'http://my-ghost-blog.com'});

        loggingInfoSpy = sinon.spy(logging, 'info');
    });

    it('should not rebuild xml for same data and url', async function () {
        const data = {
            title: 'Test Title',
            description: 'Testing Desc',
            posts: [],
            meta: {pagination: {pages: 1}}
        };
        let xmlData1;

        const baseUrl = `/rss-${crypto.randomUUID()}/`;

        const _xmlData = await rssCache.getXML(baseUrl, data);

        xmlData1 = _xmlData;

        sinon.assert.notCalled(loggingInfoSpy);

        // Call RSS again to check that we didn't rebuild
        const xmlData2 = await rssCache.getXML(baseUrl, data);

        // Assertions

        sinon.assert.calledOnce(loggingInfoSpy);

        // The data should be identical, no changing lastBuildDate
        assert.equal(xmlData1, xmlData2);
    });
});
