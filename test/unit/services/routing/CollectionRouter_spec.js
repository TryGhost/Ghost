const should = require('should'),
    sinon = require('sinon'),
    express = require('express'),
    settingsCache = require('../../../../core/server/services/settings/cache'),
    common = require('../../../../core/server/lib/common'),
    controllers = require('../../../../core/frontend/services/routing/controllers'),
    CollectionRouter = require('../../../../core/frontend/services/routing/CollectionRouter'),
    RESOURCE_CONFIG = {QUERY: {post: {controller: 'posts', resource: 'posts'}}};

describe('UNIT - services/routing/CollectionRouter', function () {
    let req, res, next;

    beforeEach(function () {
        sinon.stub(common.events, 'emit');
        sinon.stub(common.events, 'on');

        sinon.spy(CollectionRouter.prototype, 'mountRoute');
        sinon.spy(CollectionRouter.prototype, 'mountRouter');
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
            const collectionRouter = new CollectionRouter('/', {permalink: '/:slug/'}, RESOURCE_CONFIG);

            should.exist(collectionRouter.router);

            should.not.exist(collectionRouter.getFilter());
            collectionRouter.getResourceType().should.eql('posts');
            collectionRouter.templates.should.eql([]);
            collectionRouter.getPermalinks().getValue().should.eql('/:slug/');

            common.events.emit.calledOnce.should.be.true();
            common.events.emit.calledWith('router.created', collectionRouter).should.be.true();

            common.events.on.calledTwice.should.be.false();

            collectionRouter.mountRoute.callCount.should.eql(3);
            express.Router.param.callCount.should.eql(2);

            // parent route
            collectionRouter.mountRoute.args[0][0].should.eql('/');
            collectionRouter.mountRoute.args[0][1].should.eql(controllers.collection);

            // pagination feature
            collectionRouter.mountRoute.args[1][0].should.eql('/page/:page(\\d+)');
            collectionRouter.mountRoute.args[1][1].should.eql(controllers.collection);

            // permalinks
            collectionRouter.mountRoute.args[2][0].should.eql('/:slug/:options(edit)?/');
            collectionRouter.mountRoute.args[2][1].should.eql(controllers.entry);

            collectionRouter.mountRouter.callCount.should.eql(1);
            collectionRouter.mountRouter.args[0][0].should.eql('/');
            collectionRouter.mountRouter.args[0][1].should.eql(collectionRouter.rssRouter.router());
        });

        it('router name', function () {
            const collectionRouter1 = new CollectionRouter('/', {permalink: '/:slug/'}, RESOURCE_CONFIG);
            const collectionRouter2 = new CollectionRouter('/podcast/', {permalink: '/:slug/'}, RESOURCE_CONFIG);
            const collectionRouter3 = new CollectionRouter('/hello/world/', {permalink: '/:slug/'}, RESOURCE_CONFIG);

            collectionRouter1.routerName.should.eql('index');
            collectionRouter2.routerName.should.eql('podcast');
            collectionRouter3.routerName.should.eql('helloworld');

            collectionRouter1.context.should.eql(['index']);
            collectionRouter2.context.should.eql(['podcast']);
            collectionRouter3.context.should.eql(['helloworld']);
        });

        it('collection lives under /blog/', function () {
            const collectionRouter = new CollectionRouter('/blog/', {permalink: '/blog/:year/:slug/'}, RESOURCE_CONFIG);

            should.exist(collectionRouter.router);

            should.not.exist(collectionRouter.getFilter());
            collectionRouter.getResourceType().should.eql('posts');
            collectionRouter.templates.should.eql([]);
            collectionRouter.getPermalinks().getValue().should.eql('/blog/:year/:slug/');

            common.events.emit.calledOnce.should.be.true();
            common.events.emit.calledWith('router.created', collectionRouter).should.be.true();

            common.events.on.calledTwice.should.be.false();

            collectionRouter.mountRoute.callCount.should.eql(3);

            // parent route
            collectionRouter.mountRoute.args[0][0].should.eql('/blog/');
            collectionRouter.mountRoute.args[0][1].should.eql(controllers.collection);

            // pagination feature
            collectionRouter.mountRoute.args[1][0].should.eql('/blog/page/:page(\\d+)');
            collectionRouter.mountRoute.args[1][1].should.eql(controllers.collection);

            // permalinks
            collectionRouter.mountRoute.args[2][0].should.eql('/blog/:year/:slug/:options(edit)?/');
            collectionRouter.mountRoute.args[2][1].should.eql(controllers.entry);

            collectionRouter.mountRouter.callCount.should.eql(1);
            collectionRouter.mountRouter.args[0][0].should.eql('/blog/');
            collectionRouter.mountRouter.args[0][1].should.eql(collectionRouter.rssRouter.router());
        });

        it('with custom filter', function () {
            const collectionRouter = new CollectionRouter('/', {permalink: '/:slug/', filter: 'featured:true'}, RESOURCE_CONFIG);

            collectionRouter.getFilter().should.eql('featured:true');
        });

        it('with templates', function () {
            const collectionRouter = new CollectionRouter('/magic/', {permalink: '/:slug/', templates: ['home', 'index']}, RESOURCE_CONFIG);

            // they are getting reversed because we unshift the templates in the helper
            collectionRouter.templates.should.eql(['index', 'home']);
        });
    });

    describe('fn: _prepareEntriesContext', function () {
        it('index collection', function () {
            const collectionRouter = new CollectionRouter('/', {permalink: '/:slug/'}, RESOURCE_CONFIG);

            collectionRouter._prepareEntriesContext(req, res, next);

            next.calledOnce.should.be.true();
            res.routerOptions.should.eql({
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
            }, RESOURCE_CONFIG);

            collectionRouter._prepareEntriesContext(req, res, next);

            next.calledOnce.should.be.true();
            res.routerOptions.should.eql({
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

    describe('timezone changes', function () {
        describe('no dated permalink', function () {
            it('default', function () {
                const collectionRouter = new CollectionRouter('/magic/', {permalink: '/:slug/'}, RESOURCE_CONFIG);

                sinon.stub(collectionRouter, 'emit');

                common.events.on.args[0][1]({
                    attributes: {value: 'America/Los_Angeles'},
                    _previousAttributes: {value: 'Europe/London'}
                });

                collectionRouter.emit.called.should.be.false();
            });

            it('tz has not changed', function () {
                const collectionRouter = new CollectionRouter('/magic/', {permalink: '/:slug/'}, RESOURCE_CONFIG);

                sinon.stub(collectionRouter, 'emit');

                common.events.on.args[0][1]({
                    attributes: {value: 'America/Los_Angeles'},
                    _previousAttributes: {value: 'America/Los_Angeles'}
                });

                collectionRouter.emit.called.should.be.false();
            });
        });

        describe('with dated permalink', function () {
            it('default', function () {
                const collectionRouter = new CollectionRouter('/magic/', {permalink: '/:year/:slug/'}, RESOURCE_CONFIG);

                sinon.stub(collectionRouter, 'emit');

                common.events.on.args[0][1]({
                    attributes: {value: 'America/Los_Angeles'},
                    _previousAttributes: {value: 'Europe/London'}
                });

                collectionRouter.emit.calledOnce.should.be.true();
            });

            it('tz has not changed', function () {
                const collectionRouter = new CollectionRouter('/magic/', {permalink: '/:year/:slug/'}, RESOURCE_CONFIG);

                sinon.stub(collectionRouter, 'emit');

                common.events.on.args[0][1]({
                    attributes: {value: 'America/Los_Angeles'},
                    _previousAttributes: {value: 'America/Los_Angeles'}
                });

                collectionRouter.emit.called.should.be.false();
            });
        });
    });
});
