const assert = require('node:assert/strict');
const {assertExists} = require('../../../../utils/assertions');
const should = require('should');
const sinon = require('sinon');
const controllers = require('../../../../../core/frontend/services/routing/controllers');
const StaticRoutesRouter = require('../../../../../core/frontend/services/routing/static-routes-router');
const configUtils = require('../../../../utils/config-utils');

describe('UNIT - services/routing/StaticRoutesRouter', function () {
    let req;
    let res;
    let next;
    let routerCreatedSpy;
    let mountRouteSpy;

    afterEach(async function () {
        await configUtils.restore();
    });

    beforeEach(function () {
        routerCreatedSpy = sinon.spy();

        mountRouteSpy = sinon.spy(StaticRoutesRouter.prototype, 'mountRoute');
        sinon.spy(StaticRoutesRouter.prototype, 'mountRouter');

        req = sinon.stub();
        res = sinon.stub();
        next = sinon.stub();

        res.locals = {};
    });

    afterEach(function () {
        sinon.restore();
    });

    describe('static routes', function () {
        it('instantiate: default', function () {
            const staticRoutesRouter = new StaticRoutesRouter('/about/', {templates: ['test']}, routerCreatedSpy);
            assertExists(staticRoutesRouter.router);

            assert.equal(staticRoutesRouter.filter, undefined);
            assert.equal(staticRoutesRouter.getPermalinks(), undefined);

            assert.deepEqual(staticRoutesRouter.templates, ['test']);

            assert.equal(routerCreatedSpy.calledOnce, true);
            assert.equal(routerCreatedSpy.calledWith(staticRoutesRouter), true);

            assert.equal(mountRouteSpy.callCount, 1);

            // parent route
            assert.equal(mountRouteSpy.args[0][0], '/about/');
            assert.equal(mountRouteSpy.args[0][1], controllers.static);
        });

        it('initialize with data+filter', function () {
            const staticRoutesRouter = new StaticRoutesRouter('/about/', {
                data: {query: {}, router: {}},
                filter: 'tag:test'
            }, routerCreatedSpy);

            assertExists(staticRoutesRouter.router);

            assert.equal(staticRoutesRouter.getPermalinks(), undefined);
            assert.equal(staticRoutesRouter.filter, undefined);
            assert.deepEqual(staticRoutesRouter.templates, []);

            assert.equal(routerCreatedSpy.calledOnce, true);
            assert.equal(routerCreatedSpy.calledWith(staticRoutesRouter), true);

            assert.equal(mountRouteSpy.callCount, 1);

            // parent route
            assert.equal(mountRouteSpy.args[0][0], '/about/');
            assert.equal(mountRouteSpy.args[0][1], controllers.static);
        });

        it('fn: _prepareStaticRouteContext', function () {
            const staticRoutesRouter = new StaticRoutesRouter('/about/', {templates: []}, routerCreatedSpy);

            staticRoutesRouter._prepareStaticRouteContext(req, res, next);
            assert.equal(next.called, true);

            res.routerOptions.should.have.properties('type', 'templates', 'defaultTemplate', 'context', 'data', 'contentType');
            assert.equal(res.routerOptions.type, 'custom');
            assert.deepEqual(res.routerOptions.templates, []);
            assert.equal(typeof res.routerOptions.defaultTemplate, 'function');
            assert.deepEqual(res.routerOptions.context, ['about']);
            assert.deepEqual(res.routerOptions.data, {});

            assert.equal(res.routerOptions.contentType, undefined);
            assert.equal(res.locals.slug, undefined);
        });

        it('fn: _prepareStaticRouteContext (mainRoute=root)', function () {
            const staticRoutesRouter = new StaticRoutesRouter('/', {templates: []}, routerCreatedSpy);

            staticRoutesRouter._prepareStaticRouteContext(req, res, next);
            assert.equal(next.called, true);

            res.routerOptions.should.have.properties('type', 'templates', 'defaultTemplate', 'context', 'data', 'contentType');
            assert.equal(res.routerOptions.type, 'custom');
            assert.deepEqual(res.routerOptions.templates, []);
            assert.equal(typeof res.routerOptions.defaultTemplate, 'function');
            assert.deepEqual(res.routerOptions.context, ['index']);
            assert.deepEqual(res.routerOptions.data, {});

            assert.equal(res.locals.slug, undefined);
        });
    });

    describe('channels', function () {
        describe('initialize', function () {
            it('initialize with controller+data+filter', function () {
                const staticRoutesRouter = new StaticRoutesRouter('/channel/', {
                    controller: 'channel',
                    data: {query: {}, router: {}},
                    filter: 'tag:test'
                }, routerCreatedSpy);

                assertExists(staticRoutesRouter.router);

                assert.equal(staticRoutesRouter.getPermalinks(), undefined);
                assert.equal(staticRoutesRouter.filter, 'tag:test');
                assert.deepEqual(staticRoutesRouter.templates, []);
                assertExists(staticRoutesRouter.data);

                assert.equal(routerCreatedSpy.calledOnce, true);
                assert.equal(routerCreatedSpy.calledWith(staticRoutesRouter), true);

                assert.equal(mountRouteSpy.callCount, 2);

                // parent route
                assert.equal(mountRouteSpy.args[0][0], '/channel/');
                assert.equal(mountRouteSpy.args[0][1], controllers.channel);

                // pagination feature
                assert.equal(mountRouteSpy.args[1][0], '/channel/page/:page(\\d+)');
                assert.equal(mountRouteSpy.args[1][1], controllers.channel);
            });

            it('initialize with controller+filter', function () {
                const staticRoutesRouter = new StaticRoutesRouter('/channel/', {
                    controller: 'channel',
                    filter: 'tag:test'
                }, routerCreatedSpy);

                assertExists(staticRoutesRouter.router);

                assert.equal(staticRoutesRouter.getPermalinks(), undefined);
                assert.equal(staticRoutesRouter.filter, 'tag:test');

                assert.deepEqual(staticRoutesRouter.templates, []);

                assert.equal(routerCreatedSpy.calledOnce, true);
                assert.equal(routerCreatedSpy.calledWith(staticRoutesRouter), true);

                assert.equal(mountRouteSpy.callCount, 2);

                // parent route
                assert.equal(mountRouteSpy.args[0][0], '/channel/');
                assert.equal(mountRouteSpy.args[0][1], controllers.channel);

                // pagination feature
                assert.equal(mountRouteSpy.args[1][0], '/channel/page/:page(\\d+)');
                assert.equal(mountRouteSpy.args[1][1], controllers.channel);
            });

            it('initialize with controller+data', function () {
                const staticRoutesRouter = new StaticRoutesRouter('/channel/', {
                    controller: 'channel',
                    data: {query: {}, router: {}}
                }, routerCreatedSpy);

                assert.equal(staticRoutesRouter.filter, undefined);
            });

            it('initialize on subdirectory with controller+data+filter', function () {
                configUtils.set('url', 'http://localhost:2366/blog/');

                new StaticRoutesRouter('/channel/', {
                    controller: 'channel',
                    data: {query: {}, router: {}},
                    filter: 'author:michi'
                }, routerCreatedSpy);

                assert.equal(mountRouteSpy.callCount, 2);

                // parent route
                assert.equal(mountRouteSpy.args[0][0], '/channel/');
                assert.equal(mountRouteSpy.args[0][1], controllers.channel);

                // pagination feature
                assert.equal(mountRouteSpy.args[1][0], '/channel/page/:page(\\d+)');
                assert.equal(mountRouteSpy.args[1][1], controllers.channel);
            });
        });

        describe('fn: _prepareChannelContext', function () {
            it('with data+filter', function () {
                const staticRoutesRouter = new StaticRoutesRouter('/channel/', {
                    controller: 'channel',
                    data: {query: {}, router: {}},
                    filter: 'tag:test'
                }, routerCreatedSpy);

                staticRoutesRouter._prepareChannelContext(req, res, next);
                assert.equal(next.calledOnce, true);
                assert.deepEqual(res.routerOptions, {
                    type: 'channel',
                    context: ['channel'],
                    filter: 'tag:test',
                    name: 'channel',
                    data: {},
                    limit: undefined,
                    order: undefined,
                    templates: []
                });
            });

            it('with data', function () {
                const staticRoutesRouter = new StaticRoutesRouter('/nothingcomparestoyou/', {
                    controller: 'channel',
                    data: {query: {type: 'read'}, router: {}}
                }, routerCreatedSpy);

                staticRoutesRouter._prepareChannelContext(req, res, next);
                assert.equal(next.calledOnce, true);
                assert.deepEqual(res.routerOptions, {
                    type: 'channel',
                    context: ['nothingcomparestoyou'],
                    name: 'nothingcomparestoyou',
                    filter: undefined,
                    data: {type: 'read'},
                    limit: undefined,
                    order: undefined,
                    templates: []
                });
            });

            it('with filter', function () {
                const staticRoutesRouter = new StaticRoutesRouter('/channel/', {
                    controller: 'channel',
                    filter: 'tag:test'
                }, routerCreatedSpy);

                staticRoutesRouter._prepareChannelContext(req, res, next);
                assert.equal(next.calledOnce, true);
                assert.deepEqual(res.routerOptions, {
                    type: 'channel',
                    context: ['channel'],
                    filter: 'tag:test',
                    name: 'channel',
                    limit: undefined,
                    order: undefined,
                    data: {},
                    templates: []
                });
            });

            it('with order+limit', function () {
                const staticRoutesRouter = new StaticRoutesRouter('/channel/', {
                    controller: 'channel',
                    filter: 'tag:test',
                    limit: 2,
                    order: 'published_at asc'
                }, routerCreatedSpy);

                staticRoutesRouter._prepareChannelContext(req, res, next);
                assert.equal(next.calledOnce, true);
                assert.deepEqual(res.routerOptions, {
                    type: 'channel',
                    context: ['channel'],
                    filter: 'tag:test',
                    name: 'channel',
                    limit: 2,
                    order: 'published_at asc',
                    data: {},
                    templates: []
                });
            });
        });
    });
});
