const assert = require('node:assert/strict');
const {assertExists} = require('../../../../utils/assertions');
const sinon = require('sinon');
const configUtils = require('../../../../utils/config-utils');
const controllers = require('../../../../../core/frontend/services/routing/controllers');
const RSSRouter = require('../../../../../core/frontend/services/routing/rss-router');
const urlUtils = require('../../../../../core/shared/url-utils');

describe('UNIT - services/routing/RSSRouter', function () {
    describe('instantiate', function () {
        beforeEach(function () {
            sinon.spy(RSSRouter.prototype, 'mountRoute');
            sinon.spy(RSSRouter.prototype, 'mountRouter');

            sinon.stub(urlUtils, 'urlJoin');
        });

        afterEach(async function () {
            sinon.restore();
            await configUtils.restore();
        });

        it('default', function () {
            const rssRouter = new RSSRouter();

            assertExists(rssRouter.router);
            assert.equal(rssRouter.route.value, '/rss/');

            assert.equal(rssRouter.mountRoute.callCount, 2);

            assert.equal(rssRouter.mountRoute.args[0][0], '/rss/');
            assert.equal(rssRouter.mountRoute.args[0][1], controllers.rss);

            assert.equal(rssRouter.mountRoute.args[1][0], '/feed/');
        });

        it('subdirectory is enabled', function () {
            configUtils.set('url', 'http://localhost:22222/blog/');
            const rssRouter = new RSSRouter();

            assertExists(rssRouter.router);
            assert.equal(rssRouter.route.value, '/rss/');

            assert.equal(rssRouter.mountRoute.callCount, 2);

            assert.equal(rssRouter.mountRoute.args[0][0], '/rss/');
            assert.equal(rssRouter.mountRoute.args[0][1], controllers.rss);

            assert.equal(rssRouter.mountRoute.args[1][0], '/feed/');
        });
    });
});
