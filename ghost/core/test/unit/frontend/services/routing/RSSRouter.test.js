const should = require('should');
const sinon = require('sinon');
const configUtils = require('../../../../utils/configUtils');
const controllers = require('../../../../../core/frontend/services/routing/controllers');
const RSSRouter = require('../../../../../core/frontend/services/routing/RSSRouter');
const urlUtils = require('../../../../../core/shared/url-utils');

describe('UNIT - services/routing/RSSRouter', function () {
    describe('instantiate', function () {
        beforeEach(function () {
            sinon.spy(RSSRouter.prototype, 'mountRoute');
            sinon.spy(RSSRouter.prototype, 'mountRouter');

            sinon.stub(urlUtils, 'urlJoin');
        });

        afterEach(function () {
            sinon.restore();
            configUtils.restore();
        });

        it('default', function () {
            const rssRouter = new RSSRouter();

            should.exist(rssRouter.router);
            rssRouter.route.value.should.eql('/rss/');

            rssRouter.mountRoute.callCount.should.eql(2);

            rssRouter.mountRoute.args[0][0].should.eql('/rss/');
            rssRouter.mountRoute.args[0][1].should.eql(controllers.rss);

            rssRouter.mountRoute.args[1][0].should.eql('/feed/');
        });

        it('subdirectory is enabled', function () {
            configUtils.set('url', 'http://localhost:22222/blog/');
            const rssRouter = new RSSRouter();

            should.exist(rssRouter.router);
            rssRouter.route.value.should.eql('/rss/');

            rssRouter.mountRoute.callCount.should.eql(2);

            rssRouter.mountRoute.args[0][0].should.eql('/rss/');
            rssRouter.mountRoute.args[0][1].should.eql(controllers.rss);

            rssRouter.mountRoute.args[1][0].should.eql('/feed/');
        });
    });
});
