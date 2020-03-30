const should = require('should'),
    sinon = require('sinon'),
    configUtils = require('../../../utils/configUtils'),
    common = require('../../../../core/server/lib/common'),
    controllers = require('../../../../core/frontend/services/routing/controllers'),
    RSSRouter = require('../../../../core/frontend/services/routing/RSSRouter'),
    urlUtils = require('../../../../core/server/lib/url-utils');

describe('UNIT - services/routing/RSSRouter', function () {
    describe('instantiate', function () {
        beforeEach(function () {
            sinon.stub(common.events, 'emit');
            sinon.stub(common.events, 'on');

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

            common.events.emit.calledOnce.should.be.false();
            common.events.on.calledOnce.should.be.false();

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

            common.events.emit.calledOnce.should.be.false();
            common.events.on.calledOnce.should.be.false();

            rssRouter.mountRoute.callCount.should.eql(2);

            rssRouter.mountRoute.args[0][0].should.eql('/rss/');
            rssRouter.mountRoute.args[0][1].should.eql(controllers.rss);

            rssRouter.mountRoute.args[1][0].should.eql('/feed/');
        });
    });
});
