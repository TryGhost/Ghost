const should = require('should');
const sinon = require('sinon');
const controllers = require('../../../../../core/frontend/services/routing/controllers');
const StaticRoutesRouter = require('../../../../../core/frontend/services/routing/StaticRoutesRouter');
const configUtils = require('../../../../utils/configUtils');

describe('UNIT - services/routing/StaticRoutesRouter', function () {
    let req;
    let res;
    let next;
    let routerCreatedSpy;

    afterEach(function () {
        configUtils.restore();
    });

    beforeEach(function () {
        routerCreatedSpy = sinon.spy();

        sinon.spy(StaticRoutesRouter.prototype, 'mountRoute');
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
            should.exist(staticRoutesRouter.router);

            should.not.exist(staticRoutesRouter.filter);
            should.not.exist(staticRoutesRouter.getPermalinks());

            staticRoutesRouter.templates.should.eql(['test']);

            routerCreatedSpy.calledOnce.should.be.true();
            routerCreatedSpy.calledWith(staticRoutesRouter).should.be.true();

            staticRoutesRouter.mountRoute.callCount.should.eql(1);

            // parent route
            staticRoutesRouter.mountRoute.args[0][0].should.eql('/about/');
            staticRoutesRouter.mountRoute.args[0][1].should.eql(controllers.static);
        });

        it('initialize with data+filter', function () {
            const staticRoutesRouter = new StaticRoutesRouter('/about/', {
                data: {query: {}, router: {}},
                filter: 'tag:test'
            }, routerCreatedSpy);

            should.exist(staticRoutesRouter.router);

            should.not.exist(staticRoutesRouter.getPermalinks());
            should.not.exist(staticRoutesRouter.filter);
            staticRoutesRouter.templates.should.eql([]);

            routerCreatedSpy.calledOnce.should.be.true();
            routerCreatedSpy.calledWith(staticRoutesRouter).should.be.true();

            staticRoutesRouter.mountRoute.callCount.should.eql(1);

            // parent route
            staticRoutesRouter.mountRoute.args[0][0].should.eql('/about/');
            staticRoutesRouter.mountRoute.args[0][1].should.eql(controllers.static);
        });

        it('fn: _prepareStaticRouteContext', function () {
            const staticRoutesRouter = new StaticRoutesRouter('/about/', {templates: []}, routerCreatedSpy);

            staticRoutesRouter._prepareStaticRouteContext(req, res, next);
            next.called.should.be.true();

            res.routerOptions.should.have.properties('type', 'templates', 'defaultTemplate', 'context', 'data', 'contentType');
            res.routerOptions.type.should.eql('custom');
            res.routerOptions.templates.should.eql([]);
            res.routerOptions.defaultTemplate.should.be.a.Function();
            res.routerOptions.context.should.eql(['about']);
            res.routerOptions.data.should.eql({});

            should(res.routerOptions.contentType).be.undefined();
            should.not.exist(res.locals.slug);
        });

        it('fn: _prepareStaticRouteContext', function () {
            const staticRoutesRouter = new StaticRoutesRouter('/', {templates: []}, routerCreatedSpy);

            staticRoutesRouter._prepareStaticRouteContext(req, res, next);
            next.called.should.be.true();

            res.routerOptions.should.have.properties('type', 'templates', 'defaultTemplate', 'context', 'data', 'contentType');
            res.routerOptions.type.should.eql('custom');
            res.routerOptions.templates.should.eql([]);
            res.routerOptions.defaultTemplate.should.be.a.Function();
            res.routerOptions.context.should.eql(['index']);
            res.routerOptions.data.should.eql({});

            should.not.exist(res.locals.slug);
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

                should.exist(staticRoutesRouter.router);

                should.not.exist(staticRoutesRouter.getPermalinks());
                staticRoutesRouter.filter.should.eql('tag:test');
                staticRoutesRouter.templates.should.eql([]);
                should.exist(staticRoutesRouter.data);

                routerCreatedSpy.calledOnce.should.be.true();
                routerCreatedSpy.calledWith(staticRoutesRouter).should.be.true();

                staticRoutesRouter.mountRoute.callCount.should.eql(2);

                // parent route
                staticRoutesRouter.mountRoute.args[0][0].should.eql('/channel/');
                staticRoutesRouter.mountRoute.args[0][1].should.eql(controllers.channel);

                // pagination feature
                staticRoutesRouter.mountRoute.args[1][0].should.eql('/channel/page/:page(\\d+)');
                staticRoutesRouter.mountRoute.args[1][1].should.eql(controllers.channel);
            });

            it('initialize with controller+filter', function () {
                const staticRoutesRouter = new StaticRoutesRouter('/channel/', {
                    controller: 'channel',
                    filter: 'tag:test'
                }, routerCreatedSpy);

                should.exist(staticRoutesRouter.router);

                should.not.exist(staticRoutesRouter.getPermalinks());
                staticRoutesRouter.filter.should.eql('tag:test');

                staticRoutesRouter.templates.should.eql([]);

                routerCreatedSpy.calledOnce.should.be.true();
                routerCreatedSpy.calledWith(staticRoutesRouter).should.be.true();

                staticRoutesRouter.mountRoute.callCount.should.eql(2);

                // parent route
                staticRoutesRouter.mountRoute.args[0][0].should.eql('/channel/');
                staticRoutesRouter.mountRoute.args[0][1].should.eql(controllers.channel);

                // pagination feature
                staticRoutesRouter.mountRoute.args[1][0].should.eql('/channel/page/:page(\\d+)');
                staticRoutesRouter.mountRoute.args[1][1].should.eql(controllers.channel);
            });

            it('initialize with controller+data', function () {
                const staticRoutesRouter = new StaticRoutesRouter('/channel/', {
                    controller: 'channel',
                    data: {query: {}, router: {}}
                }, routerCreatedSpy);

                should.not.exist(staticRoutesRouter.filter);
            });

            it('initialize on subdirectory with controller+data+filter', function () {
                configUtils.set('url', 'http://localhost:2366/blog/');

                const staticRoutesRouter = new StaticRoutesRouter('/channel/', {
                    controller: 'channel',
                    data: {query: {}, router: {}},
                    filter: 'author:michi'
                }, routerCreatedSpy);

                staticRoutesRouter.mountRoute.callCount.should.eql(2);

                // parent route
                staticRoutesRouter.mountRoute.args[0][0].should.eql('/channel/');
                staticRoutesRouter.mountRoute.args[0][1].should.eql(controllers.channel);

                // pagination feature
                staticRoutesRouter.mountRoute.args[1][0].should.eql('/channel/page/:page(\\d+)');
                staticRoutesRouter.mountRoute.args[1][1].should.eql(controllers.channel);
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
                next.calledOnce.should.eql(true);
                res.routerOptions.should.eql({
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
                next.calledOnce.should.eql(true);
                res.routerOptions.should.eql({
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
                next.calledOnce.should.eql(true);
                res.routerOptions.should.eql({
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
                next.calledOnce.should.eql(true);
                res.routerOptions.should.eql({
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
