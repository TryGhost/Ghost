const assert = require('node:assert/strict');
const {assertExists} = require('../../../../utils/assertions');
const should = require('should');
const sinon = require('sinon');
const express = require('../../../../../core/shared/express')._express;
const events = require('../../../../../core/server/lib/common/events');
const controllers = require('../../../../../core/frontend/services/routing/controllers');
const CollectionRouter = require('../../../../../core/frontend/services/routing/collection-router');
const RESOURCE_CONFIG = {QUERY: {post: {controller: 'posts', resource: 'posts'}}};

describe('UNIT - services/routing/CollectionRouter', function () {
    let req;
    let res;
    let next;
    let routerCreatedSpy;
    let mountRouteSpy;
    let mountRouterSpy;

    beforeEach(function () {
        sinon.stub(events, 'emit');
        sinon.stub(events, 'on');
        routerCreatedSpy = sinon.spy();

        mountRouteSpy = sinon.spy(CollectionRouter.prototype, 'mountRoute');
        mountRouterSpy = sinon.spy(CollectionRouter.prototype, 'mountRouter');
        sinon.spy(CollectionRouter.prototype, 'unmountRoute');
        sinon.spy(express.Router, 'param');

        req = sinon.stub();
        res = sinon.stub();
        next = sinon.stub();

        res.locals = {};
    });

    afterEach(function () {
        sinon.restore();
    });

    describe('instantiate', function () {
        it('default', function () {
            const collectionRouter = new CollectionRouter('/', {permalink: '/:slug/'}, RESOURCE_CONFIG, routerCreatedSpy);

            assertExists(collectionRouter.router);

            assert.equal(collectionRouter.filter, undefined);
            assert.equal(collectionRouter.getResourceType(), 'posts');
            assert.deepEqual(collectionRouter.templates, []);
            assert.equal(collectionRouter.getPermalinks().getValue(), '/:slug/');

            assert.equal(routerCreatedSpy.calledOnce, true);
            assert.equal(routerCreatedSpy.calledWith(collectionRouter), true);

            assert.equal(mountRouteSpy.callCount, 3);
            assert.equal(express.Router.param.callCount, 2);

            // parent route
            assert.equal(mountRouteSpy.args[0][0], '/');
            assert.equal(mountRouteSpy.args[0][1], controllers.collection);

            // pagination feature
            assert.equal(mountRouteSpy.args[1][0], '/page/:page(\\d+)');
            assert.equal(mountRouteSpy.args[1][1], controllers.collection);

            // permalinks
            assert.equal(mountRouteSpy.args[2][0], '/:slug/:options(edit)?/');
            assert.equal(mountRouteSpy.args[2][1], controllers.entry);

            assert.equal(mountRouterSpy.callCount, 1);
            assert.equal(mountRouterSpy.args[0][0], '/');
            assert.equal(mountRouterSpy.args[0][1], collectionRouter.rssRouter.router());
        });

        it('router name', function () {
            const collectionRouter1 = new CollectionRouter('/', {permalink: '/:slug/'}, RESOURCE_CONFIG, routerCreatedSpy);
            const collectionRouter2 = new CollectionRouter('/podcast/', {permalink: '/:slug/'}, RESOURCE_CONFIG, routerCreatedSpy);
            const collectionRouter3 = new CollectionRouter('/hello/world/', {permalink: '/:slug/'}, RESOURCE_CONFIG, routerCreatedSpy);

            assert.equal(collectionRouter1.routerName, 'index');
            assert.equal(collectionRouter2.routerName, 'podcast');
            assert.equal(collectionRouter3.routerName, 'helloworld');

            assert.deepEqual(collectionRouter1.context, ['index']);
            assert.deepEqual(collectionRouter2.context, ['podcast']);
            assert.deepEqual(collectionRouter3.context, ['helloworld']);
        });

        it('collection lives under /blog/', function () {
            const collectionRouter = new CollectionRouter('/blog/', {permalink: '/blog/:year/:slug/'}, RESOURCE_CONFIG, routerCreatedSpy);

            assertExists(collectionRouter.router);

            assert.equal(collectionRouter.filter, undefined);
            assert.equal(collectionRouter.getResourceType(), 'posts');
            assert.deepEqual(collectionRouter.templates, []);
            assert.equal(collectionRouter.getPermalinks().getValue(), '/blog/:year/:slug/');

            assert.equal(routerCreatedSpy.calledOnce, true);
            assert.equal(routerCreatedSpy.calledWith(collectionRouter), true);

            assert.equal(mountRouteSpy.callCount, 3);

            // parent route
            assert.equal(mountRouteSpy.args[0][0], '/blog/');
            assert.equal(mountRouteSpy.args[0][1], controllers.collection);

            // pagination feature
            assert.equal(mountRouteSpy.args[1][0], '/blog/page/:page(\\d+)');
            assert.equal(mountRouteSpy.args[1][1], controllers.collection);

            // permalinks
            assert.equal(mountRouteSpy.args[2][0], '/blog/:year/:slug/:options(edit)?/');
            assert.equal(mountRouteSpy.args[2][1], controllers.entry);

            assert.equal(mountRouterSpy.callCount, 1);
            assert.equal(mountRouterSpy.args[0][0], '/blog/');
            assert.equal(mountRouterSpy.args[0][1], collectionRouter.rssRouter.router());
        });

        it('with custom filter', function () {
            const collectionRouter = new CollectionRouter('/', {permalink: '/:slug/', filter: 'featured:true'}, RESOURCE_CONFIG, routerCreatedSpy);

            assert.equal(collectionRouter.filter, 'featured:true');
        });

        it('with templates', function () {
            const collectionRouter = new CollectionRouter('/magic/', {permalink: '/:slug/', templates: ['home', 'index']}, RESOURCE_CONFIG, routerCreatedSpy);

            // they are getting reversed because we unshift the templates in the helper
            assert.deepEqual(collectionRouter.templates, ['index', 'home']);
        });
    });

    describe('fn: _prepareEntriesContext', function () {
        it('index collection', function () {
            const collectionRouter = new CollectionRouter('/', {permalink: '/:slug/'}, RESOURCE_CONFIG, routerCreatedSpy);

            collectionRouter._prepareEntriesContext(req, res, next);

            assert.equal(next.calledOnce, true);
            assert.deepEqual(res.routerOptions, {
                type: 'collection',
                filter: undefined,
                permalinks: '/:slug/:options(edit)?/',
                query: {controller: 'posts', resource: 'posts'},
                frontPageTemplate: 'home',
                templates: [],
                identifier: collectionRouter.identifier,
                context: ['index'],
                name: 'index',
                resourceType: 'posts',
                data: {},
                order: undefined,
                limit: undefined
            });
        });

        it('with templates, with order + limit, no index collection', function () {
            const collectionRouter = new CollectionRouter('/magic/', {
                permalink: '/:slug/',
                order: 'published asc',
                limit: 19,
                templates: ['home', 'index']
            }, RESOURCE_CONFIG, routerCreatedSpy);

            collectionRouter._prepareEntriesContext(req, res, next);

            assert.equal(next.calledOnce, true);
            assert.deepEqual(res.routerOptions, {
                type: 'collection',
                filter: undefined,
                permalinks: '/:slug/:options(edit)?/',
                query: {controller: 'posts', resource: 'posts'},
                frontPageTemplate: 'home',
                templates: ['index', 'home'],
                identifier: collectionRouter.identifier,
                context: ['magic'],
                name: 'magic',
                resourceType: 'posts',
                data: {},
                order: 'published asc',
                limit: 19
            });
        });
    });
});
