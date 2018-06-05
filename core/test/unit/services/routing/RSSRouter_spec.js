const should = require('should'),
    sinon = require('sinon'),
    configUtils = require('../../../utils/configUtils'),
    common = require('../../../../server/lib/common'),
    controllers = require('../../../../server/services/routing/controllers'),
    RSSRouter = require('../../../../server/services/routing/RSSRouter'),
    urlService = require('../../../../server/services/url'),
    sandbox = sinon.sandbox.create();

describe('UNIT - services/routing/RSSRouter', function () {
    describe('instantiate', function () {
        beforeEach(function () {
            sandbox.stub(common.events, 'emit');
            sandbox.stub(common.events, 'on');

            sandbox.spy(RSSRouter.prototype, 'mountRoute');
            sandbox.spy(RSSRouter.prototype, 'mountRouter');

            sandbox.stub(urlService.utils, 'urlJoin');
        });

        afterEach(function () {
            sandbox.restore();
            configUtils.restore();
        });

        it('default', function () {
            urlService.utils.urlJoin.withArgs('/rss/', ':page(\\d+)').returns('/rss-pagination/');

            const rssRouter = new RSSRouter();

            should.exist(rssRouter.router);
            rssRouter.route.value.should.eql('/rss/');

            common.events.emit.calledOnce.should.be.false();
            common.events.on.calledOnce.should.be.false();

            rssRouter.mountRoute.callCount.should.eql(3);

            rssRouter.mountRoute.args[0][0].should.eql('/rss/');
            rssRouter.mountRoute.args[0][1].should.eql(controllers.rss);

            rssRouter.mountRoute.args[1][0].should.eql('/rss-pagination/');
            rssRouter.mountRoute.args[1][1].should.eql(controllers.rss);

            rssRouter.mountRoute.args[2][0].should.eql('/feed/');
        });

        it('subdirectory is enabled', function () {
            configUtils.set('url', 'http://localhost:22222/blog/');
            urlService.utils.urlJoin.withArgs('/rss/', ':page(\\d+)').returns('/rss-pagination/');

            const rssRouter = new RSSRouter();

            should.exist(rssRouter.router);
            rssRouter.route.value.should.eql('/rss/');

            common.events.emit.calledOnce.should.be.false();
            common.events.on.calledOnce.should.be.false();

            rssRouter.mountRoute.callCount.should.eql(3);

            rssRouter.mountRoute.args[0][0].should.eql('/rss/');
            rssRouter.mountRoute.args[0][1].should.eql(controllers.rss);

            rssRouter.mountRoute.args[1][0].should.eql('/rss-pagination/');
            rssRouter.mountRoute.args[1][1].should.eql(controllers.rss);

            rssRouter.mountRoute.args[2][0].should.eql('/feed/');
        });
    });
});
