const should = require('should'),
    sinon = require('sinon'),
    settingsCache = require('../../../../server/services/settings/cache'),
    common = require('../../../../server/lib/common'),
    controllers = require('../../../../server/services/routing/controllers'),
    StaticRoutesRouter = require('../../../../server/services/routing/StaticRoutesRouter'),
    configUtils = require('../../../utils/configUtils'),
    sandbox = sinon.sandbox.create();

describe('UNIT - services/routing/StaticRoutesRouter', function () {
    let req, res, next;

    afterEach(function () {
        configUtils.restore();
    });

    beforeEach(function () {
        sandbox.stub(settingsCache, 'get').withArgs('permalinks').returns('/:slug/');

        sandbox.stub(common.events, 'emit');
        sandbox.stub(common.events, 'on');

        sandbox.spy(StaticRoutesRouter.prototype, 'mountRoute');
        sandbox.spy(StaticRoutesRouter.prototype, 'mountRouter');

        req = sandbox.stub();
        res = sandbox.stub();
        next = sandbox.stub();

        res.locals = {};
    });

    afterEach(function () {
        sandbox.restore();
    });

    describe('static routes', function () {
        it('instantiate: default', function () {
            const staticRoutesRouter = new StaticRoutesRouter('/about/', {templates: ['test']});
            should.exist(staticRoutesRouter.router);

            should.not.exist(staticRoutesRouter.getFilter());
            should.not.exist(staticRoutesRouter.getPermalinks());

            staticRoutesRouter.templates.should.eql(['test']);

            common.events.emit.calledOnce.should.be.true();
            common.events.emit.calledWith('router.created', staticRoutesRouter).should.be.true();

            staticRoutesRouter.mountRoute.callCount.should.eql(1);

            // parent route
            staticRoutesRouter.mountRoute.args[0][0].should.eql('/about/');
            staticRoutesRouter.mountRoute.args[0][1].should.eql(controllers.static);
        });

        it('initialise with data+filter', function () {
            const staticRoutesRouter = new StaticRoutesRouter('/about/', {
                data: {query: {}, router: {}},
                filter: 'tag:test'
            });

            should.exist(staticRoutesRouter.router);

            should.not.exist(staticRoutesRouter.getPermalinks());
            should.not.exist(staticRoutesRouter.getFilter());
            staticRoutesRouter.templates.should.eql([]);

            common.events.emit.calledOnce.should.be.true();
            common.events.emit.calledWith('router.created', staticRoutesRouter).should.be.true();

            staticRoutesRouter.mountRoute.callCount.should.eql(1);

            // parent route
            staticRoutesRouter.mountRoute.args[0][0].should.eql('/about/');
            staticRoutesRouter.mountRoute.args[0][1].should.eql(controllers.static);
        });

        it('fn: _prepareStaticRouteContext', function () {
            const staticRoutesRouter = new StaticRoutesRouter('/about/', {templates: []});

            staticRoutesRouter._prepareStaticRouteContext(req, res, next);
            next.called.should.be.true();
            res._route.should.eql({
                type: 'custom',
                templates: [],
                defaultTemplate: 'default'
            });

            res.locals.routerOptions.should.eql({context: [], data: {}});
            should.not.exist(res.locals.slug);
        });
    });

    describe('channels', function () {
        describe('initialise', function () {
            it('initialise with controller+data+filter', function () {
                const staticRoutesRouter = new StaticRoutesRouter('/channel/', {
                    controller: 'channel',
                    data: {query: {}, router: {}},
                    filter: 'tag:test'
                });

                should.exist(staticRoutesRouter.router);

                should.not.exist(staticRoutesRouter.getPermalinks());
                staticRoutesRouter.getFilter().should.eql('tag:test');
                staticRoutesRouter.templates.should.eql([]);
                should.exist(staticRoutesRouter.data);

                common.events.emit.calledOnce.should.be.true();
                common.events.emit.calledWith('router.created', staticRoutesRouter).should.be.true();

                staticRoutesRouter.mountRoute.callCount.should.eql(2);

                // parent route
                staticRoutesRouter.mountRoute.args[0][0].should.eql('/channel/');
                staticRoutesRouter.mountRoute.args[0][1].should.eql(controllers.channel);

                // pagination feature
                staticRoutesRouter.mountRoute.args[1][0].should.eql('/channel/page/:page(\\d+)');
                staticRoutesRouter.mountRoute.args[1][1].should.eql(controllers.channel);
            });

            it('initialise with controller+filter', function () {
                const staticRoutesRouter = new StaticRoutesRouter('/channel/', {
                    controller: 'channel',
                    filter: 'tag:test'
                });

                should.exist(staticRoutesRouter.router);

                should.not.exist(staticRoutesRouter.getPermalinks());
                staticRoutesRouter.getFilter().should.eql('tag:test');

                staticRoutesRouter.templates.should.eql([]);

                common.events.emit.calledOnce.should.be.true();
                common.events.emit.calledWith('router.created', staticRoutesRouter).should.be.true();

                staticRoutesRouter.mountRoute.callCount.should.eql(2);

                // parent route
                staticRoutesRouter.mountRoute.args[0][0].should.eql('/channel/');
                staticRoutesRouter.mountRoute.args[0][1].should.eql(controllers.channel);

                // pagination feature
                staticRoutesRouter.mountRoute.args[1][0].should.eql('/channel/page/:page(\\d+)');
                staticRoutesRouter.mountRoute.args[1][1].should.eql(controllers.channel);
            });

            it('initialise with controller+data', function () {
                const staticRoutesRouter = new StaticRoutesRouter('/channel/', {
                    controller: 'channel',
                    data: {query: {}, router: {}},
                });

                should.not.exist(staticRoutesRouter.getFilter());
            });

            it('initialise on subdirectory with controller+data+filter', function () {
                configUtils.set('url', 'http://localhost:2366/blog/');

                const staticRoutesRouter = new StaticRoutesRouter('/channel/', {
                    controller: 'channel',
                    data: {query: {}, router: {}},
                    filter: 'author:michi'
                });

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
                });

                staticRoutesRouter._prepareChannelContext(req, res, next);
                next.calledOnce.should.eql(true);
                res.locals.routerOptions.should.eql({
                    context: ['channel'],
                    filter: 'tag:test',
                    name: 'channel',
                    data: {},
                    limit: undefined,
                    order: undefined,
                    templates: []
                });

                res._route.type.should.eql('channel');
            });

            it('with data', function () {
                const staticRoutesRouter = new StaticRoutesRouter('/nothingcomparestoyou/', {
                    controller: 'channel',
                    data: {query: {type: 'read'}, router: {}}
                });

                staticRoutesRouter._prepareChannelContext(req, res, next);
                next.calledOnce.should.eql(true);
                res.locals.routerOptions.should.eql({
                    context: ['nothingcomparestoyou'],
                    name: 'nothingcomparestoyou',
                    filter: undefined,
                    data: {type: 'read'},
                    limit: undefined,
                    order: undefined,
                    templates: []
                });

                res._route.type.should.eql('channel');
            });

            it('with filter', function () {
                const staticRoutesRouter = new StaticRoutesRouter('/channel/', {
                    controller: 'channel',
                    filter: 'tag:test'
                });

                staticRoutesRouter._prepareChannelContext(req, res, next);
                next.calledOnce.should.eql(true);
                res.locals.routerOptions.should.eql({
                    context: ['channel'],
                    filter: 'tag:test',
                    name: 'channel',
                    limit: undefined,
                    order: undefined,
                    data: {},
                    templates: []
                });

                res._route.type.should.eql('channel');
            });

            it('with order+limit', function () {
                const staticRoutesRouter = new StaticRoutesRouter('/channel/', {
                    controller: 'channel',
                    filter: 'tag:test',
                    limit: 2,
                    order: 'published_at asc'
                });

                staticRoutesRouter._prepareChannelContext(req, res, next);
                next.calledOnce.should.eql(true);
                res.locals.routerOptions.should.eql({
                    context: ['channel'],
                    filter: 'tag:test',
                    name: 'channel',
                    limit: 2,
                    order: 'published_at asc',
                    data: {},
                    templates: []
                });

                res._route.type.should.eql('channel');
            });
        });
    });
});
