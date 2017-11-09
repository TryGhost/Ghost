var should = require('should'),  // jshint ignore:line
    sinon = require('sinon'),
    _ = require('lodash'),

    // Stuff we are testing
    channelLoader = require('../../../../server/services/channels/loader'),
    channelsParentRouter = require('../../../../server/services/channels'),
    channelUtils = require('../../../utils/channelUtils'),
    Channel = channelUtils.Channel,

    sandbox = sinon.sandbox.create();

/**
 * These tests are a bit weird, because we are testing the express private API
 * Would be better to be testing our own internal API E.g. setupRSS.calledOnce, rather than router stack!
 *
 * This is partly because router_spec.js is testing a full stack of behaviour, including the loader
 * And we need to differentiate more between testing the default channels, and channels in general
 */
describe('Custom Channels', function () {
    var channelLoaderStub, channelsRouter, firstChannel, secondChannel, routeStack;

    afterEach(function () {
        sandbox.restore();
    });

    beforeEach(function () {
        channelLoaderStub = sandbox.stub(channelLoader, 'list');
    });

    function getNewChannelsRouter() {
        return channelsParentRouter.router();
    }

    it('allows basic custom config', function () {
        channelLoaderStub.returns([new Channel('home', {route: '/home/'})]);

        // Load the router
        channelsRouter = getNewChannelsRouter();

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
                stack: ['doChannelConfig', 'channelController']
            }
        });

        // Layer 2 should be the handler for pagination
        routeStack[1].should.be.a.DispatchLayer({
            keys: ['page'],
            route: {
                path: '/page/:page(\\d+)/',
                stack: ['doChannelConfig', 'channelController']
            }
        });

        // Layer 3 should be a whole new router for RSS
        routeStack[2].should.be.an.RSSRouter();
    });

    it('allow multiple channels to be defined', function () {
        channelLoaderStub.returns(
            [
                new Channel('home', {route: '/home/'}),
                new Channel('featured', {
                    route: '/featured/',
                    postOptions: {
                        filter: 'featured:true'
                    }
                })
            ]);

        // Load the router
        channelsRouter = getNewChannelsRouter();

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
                stack: ['doChannelConfig', 'channelController']
            }
        });

        // Layer 2 should be the handler for pagination
        routeStack[1].should.be.a.DispatchLayer({
            keys: ['page'],
            route: {
                path: '/page/:page(\\d+)/',
                stack: ['doChannelConfig', 'channelController']
            }
        });

        // Layer 3 should be a whole new router for RSS
        routeStack[2].should.be.an.RSSRouter();
    });

    it('allows rss to be disabled', function () {
        channelLoaderStub.returns([new Channel('home', {
            route: '/home/',
            rss: false
        })]);

        // Load the router
        channelsRouter = getNewChannelsRouter();

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
                stack: ['doChannelConfig', 'channelController']
            }
        });

        // Layer 2 should be the handler for pagination
        routeStack[1].should.be.a.DispatchLayer({
            keys: ['page'],
            route: {
                path: '/page/:page(\\d+)/',
                stack: ['doChannelConfig', 'channelController']
            }
        });

        // Layer 3 does not exist
        should.not.exist(routeStack[2]);
    });

    it('allows pagination to be disabled', function () {
        channelLoaderStub.returns([new Channel('home', {
            route: '/home/',
            paged: false
        })]);

        // Load the router
        channelsRouter = getNewChannelsRouter();

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
                stack: ['doChannelConfig', 'channelController']
            }
        });

        // Layer 2 should be the handler for /rss/
        routeStack[1].should.be.an.RSSRouter();

        // Layer 3 does not exist
        should.not.exist(routeStack[2]);
    });
});
