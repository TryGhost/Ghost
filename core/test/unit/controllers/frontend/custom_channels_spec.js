var should = require('should'),  // jshint ignore:line
    sinon = require('sinon'),
    _ = require('lodash'),

    // Stuff we are testing
    channelConfig = require('../../../../server/controllers/frontend/channel-config'),
    channels = require('../../../../server/controllers/frontend/channels'),

    sandbox = sinon.sandbox.create();

/**
 * Assertions on the express API
 */
should.Assertion.add('ExpressRouter', function (options) {
    options = options || {};

    this.params = {operator: 'to be a valid Express Router'};
    this.obj.should.be.a.Function();
    this.obj.name.should.eql('router');
    this.obj.should.have.property('mergeParams', true);
    this.obj.should.have.property('strict', undefined);
    this.obj.should.have.property('stack');

    if (options.params) {
        // Verify the params function!
        this.obj.params.should.have.property(options.params.key);
        this.obj.params[options.params.key][0].name.should.eql(options.params.value);
    }

    this.obj.stack.should.be.an.Array();
    if (options.stackLength) {
        this.obj.stack.should.have.lengthOf(options.stackLength);
    }
});

should.Assertion.add('Layer', function () {
    this.params = {operator: 'to be a valid Express Layer'};

    this.obj.should.be.an.Object().with.properties(['handle', 'name', 'params', 'path', 'keys', 'regexp', 'route']);
});

should.Assertion.add('RouterLayer', function (options) {
    options = options || {};

    this.params = {operator: 'to be a valid Express Layer, with Router as handle'};

    this.obj.should.be.a.Layer();
    this.obj.name.should.eql('router');
    this.obj.handle.should.be.an.ExpressRouter(options);

    if (options.regexp) {
        this.obj.regexp.toString().should.match(options.regexp);
    }
});

should.Assertion.add('DispatchLayer', function (options) {
    options = options || {};

    this.params = {operator: 'to be a valid Express Layer, with Dispatch as handle'};
    this.obj.should.be.a.Layer();
    this.obj.name.should.eql('bound dispatch');

    if (options.regexp) {
        this.obj.regexp.toString().should.match(options.regexp);
    }

    if (options.keys) {
        this.obj.keys.should.be.an.Array().with.lengthOf(options.keys.length);
        _.map(this.obj.keys, 'name').should.eql(options.keys);
    } else {
        this.obj.keys.should.be.an.Array().with.lengthOf(0);
    }

    this.obj.route.should.be.an.Object().with.properties(['path', 'stack', 'methods']);
    if (options.route && options.route.path) {
        this.obj.route.path.should.eql(options.route.path);
    }

    if (options.route.stack) {
        this.obj.route.stack.should.be.an.Array().with.lengthOf(options.route.stack.length);
        _.map(this.obj.route.stack, 'name').should.eql(options.route.stack);
    } else {
        this.obj.route.stack.should.be.an.Array();
    }
});

should.Assertion.add('RSSRouter', function () {
    this.params = {operator: 'to be a valid RSS Router'};

    this.obj.should.be.a.RouterLayer({
        stackLength: 3,
        params: {
            key: 'page',
            value: 'handlePageParam'
        }
    });

    var routeStack = this.obj.handle.stack;

    // Layer 1 should be the handler for /rss/
    routeStack[0].should.be.a.DispatchLayer({
        route: {
            path: '/rss/',
            stack: ['doChannelConfig', 'rssConfigMiddleware', 'generate']
        }
    });

    // Layer 2 should be the handler for pagination
    routeStack[1].should.be.a.DispatchLayer({
        keys: ['page'],
        route: {
            path: '/rss/:page(\\d+)/',
            stack: ['doChannelConfig', 'rssConfigMiddleware', 'generate']
        }
    });

    // // Layer 3 should be a handler for the extra /feed/ url
    routeStack[2].should.be.a.DispatchLayer({
        route: {
            path: '/feed/',
            stack: ['redirectToRSS']
        }
    });
});

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

        var channelsRouter = channels.router(),
            firstChannel,
            routeStack;

        channelsRouter.should.be.an.ExpressRouter({stackLength: 1});
        firstChannel = channelsRouter.stack[0];
        firstChannel.should.be.a.RouterLayer({
            stackLength: 3,
            regexp: /\\\/home\\\//,
            params: {
                key: 'page',
                value: 'handlePageParam'
            }
        });

        // The stack underneath our first channel router
        routeStack = firstChannel.handle.stack;

        // Layer 1 should be the handler for /
        routeStack[0].should.be.a.DispatchLayer({
            route: {
                path: '/',
                stack: ['doChannelConfig', 'renderChannel']
            }
        });

        // Layer 2 should be the handler for pagination
        routeStack[1].should.be.a.DispatchLayer({
            keys: ['page'],
            route: {
                path: '/page/:page(\\d+)/',
                stack: ['doChannelConfig', 'renderChannel']
            }
        });

        // Layer 3 should be a whole new router for RSS
        routeStack[2].should.be.an.RSSRouter();
    });

    it('allow multiple channels to be defined', function () {
        sandbox.stub(channelConfig, 'list').returns({
            home: {
                name: 'home',
                route: '/home/'
            },
            featured: {
                name: 'featured',
                route: '/featured/',
                postOptions: {
                    filter: 'featured:true'
                }
            }
        });

        var channelsRouter = channels.router(),
            firstChannel,
            secondChannel,
            routeStack;

        channelsRouter.should.be.an.ExpressRouter({stackLength: 2});
        firstChannel = channelsRouter.stack[0];
        secondChannel = channelsRouter.stack[1];
        firstChannel.should.be.a.RouterLayer({
            stackLength: 3,
            regexp: /\\\/home\\\//,
            params: {
                key: 'page',
                value: 'handlePageParam'
            }
        });

        secondChannel.should.be.a.RouterLayer({
            stackLength: 3,
            regexp: /\\\/featured\\\//,
            params: {
                key: 'page',
                value: 'handlePageParam'
            }
        });

        // The stack underneath our first channel router
        routeStack = secondChannel.handle.stack;

        // Layer 1 should be the handler for /
        routeStack[0].should.be.a.DispatchLayer({
            route: {
                path: '/',
                stack: ['doChannelConfig', 'renderChannel']
            }
        });

        // Layer 2 should be the handler for pagination
        routeStack[1].should.be.a.DispatchLayer({
            keys: ['page'],
            route: {
                path: '/page/:page(\\d+)/',
                stack: ['doChannelConfig', 'renderChannel']
            }
        });

        // Layer 3 should be a whole new router for RSS
        routeStack[2].should.be.an.RSSRouter();
    });

    it('allows rss to be disabled', function () {
        sandbox.stub(channelConfig, 'list').returns({
            home: {
                name: 'home',
                route: '/home/',
                rss: false
            }
        });

        var channelsRouter = channels.router(),
            firstChannel,
            routeStack;

        channelsRouter.should.be.an.ExpressRouter({stackLength: 1});
        firstChannel = channelsRouter.stack[0];
        firstChannel.should.be.a.RouterLayer({
            stackLength: 2,
            regexp: /\\\/home\\\//,
            params: {
                key: 'page',
                value: 'handlePageParam'
            }
        });

        // The stack underneath our first channel router
        routeStack = firstChannel.handle.stack;

        // Layer 1 should be the handler for /
        routeStack[0].should.be.a.DispatchLayer({
            route: {
                path: '/',
                stack: ['doChannelConfig', 'renderChannel']
            }
        });

        // Layer 2 should be the handler for pagination
        routeStack[1].should.be.a.DispatchLayer({
            keys: ['page'],
            route: {
                path: '/page/:page(\\d+)/',
                stack: ['doChannelConfig', 'renderChannel']
            }
        });

        // Layer 3 does not exist
        should.not.exist(routeStack[2]);
    });

    it('allows pagination to be disabled', function () {
        sandbox.stub(channelConfig, 'list').returns({
            home: {
                name: 'home',
                route: '/home/',
                paged: false
            }
        });

        var channelsRouter = channels.router(),
            firstChannel,
            routeStack;

        channelsRouter.should.be.an.ExpressRouter({stackLength: 1});
        firstChannel = channelsRouter.stack[0];
        firstChannel.should.be.a.RouterLayer({
            stackLength: 2,
            regexp: /\\\/home\\\//
        });

        // The stack underneath our first channel router
        routeStack = firstChannel.handle.stack;

        // Layer 1 should be the handler for /
        routeStack[0].should.be.a.DispatchLayer({
            route: {
                path: '/',
                stack: ['doChannelConfig', 'renderChannel']
            }
        });

        // Layer 2 should be the handler for /rss/
        routeStack[1].should.be.an.RSSRouter();

        // Layer 3 does not exist
        should.not.exist(routeStack[2]);
    });
});
