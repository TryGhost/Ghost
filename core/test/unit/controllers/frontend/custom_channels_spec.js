var should = require('should'),  // jshint ignore:line
    sinon = require('sinon'),

    // Stuff we are testing
    channelConfig = require('../../../../server/controllers/frontend/channel-config'),
    channels = require('../../../../server/controllers/frontend/channels'),

    sandbox = sinon.sandbox.create();

/**
 * These tests are a bit weird,
 * need to test express private API
 * Would be better to be testing our own internal API
 * E.g. setupRSS.calledOnce, rather than router stack!
 */
describe('Custom Channels', function () {
    afterEach(function () {
        sandbox.restore();
    });

    it('allows basic custom config', function () {
        sandbox.stub(channelConfig, 'list').returns({
            home: {
                name: 'home',
                route: '/home/'
            }
        });

        var channelRouter = channels.router(),
            topRouter = channelRouter.stack[0],
            routeStack = topRouter.handle.stack,
            rssRouter = routeStack[2].handle.stack;

        topRouter.regexp.toString().should.match(/\\\/home\\\//);
        routeStack.should.have.lengthOf(3);

        // Route 1 should be /
        routeStack[0].route.path.should.eql('/');
        // Route 2 should be pagination
        routeStack[1].route.path.should.eql('/page/:page(\\d+)/');
        // Route 3 should be a whole new router for RSS
        rssRouter.should.have.lengthOf(3);
        rssRouter[0].route.path.should.eql('/rss/');
        rssRouter[1].route.path.should.eql('/rss/:page(\\d+)/');
        rssRouter[2].route.path.should.eql('/feed/');
    });

    it('allows rss to be disabled', function () {
        sandbox.stub(channelConfig, 'list').returns({
            home: {
                name: 'home',
                route: '/home/',
                rss: false
            }
        });

        var channelRouter = channels.router(),
            topRouter = channelRouter.stack[0],
            routeStack = topRouter.handle.stack;

        topRouter.regexp.toString().should.match(/\\\/home\\\//);
        routeStack.should.have.lengthOf(2);

        // Route 1 should be /
        routeStack[0].route.path.should.eql('/');
        // Route 2 should be pagination
        routeStack[1].route.path.should.eql('/page/:page(\\d+)/');
    });

    it('allows pagination to be disabled', function () {
        sandbox.stub(channelConfig, 'list').returns({
            home: {
                name: 'home',
                route: '/home/',
                paged: false
            }
        });

        var channelRouter = channels.router(),
            topRouter = channelRouter.stack[0],
            routeStack = topRouter.handle.stack,
            rssRouter = routeStack[1].handle.stack;

        topRouter.regexp.toString().should.match(/\\\/home\\\//);
        routeStack.should.have.lengthOf(2);

        // Route 1 should be /
        routeStack[0].route.path.should.eql('/');
        // Route 2 should be a whole new router for RSS
        rssRouter.should.have.lengthOf(3);
        rssRouter[0].route.path.should.eql('/rss/');
        rssRouter[1].route.path.should.eql('/rss/:page(\\d+)/');
        rssRouter[2].route.path.should.eql('/feed/');
    });
});
