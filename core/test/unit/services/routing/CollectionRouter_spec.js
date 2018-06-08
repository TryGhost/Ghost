const should = require('should'),
    sinon = require('sinon'),
    settingsCache = require('../../../../server/services/settings/cache'),
    common = require('../../../../server/lib/common'),
    controllers = require('../../../../server/services/routing/controllers'),
    CollectionRouter = require('../../../../server/services/routing/CollectionRouter'),
    sandbox = sinon.sandbox.create();

describe('UNIT - services/routing/CollectionRouter', function () {
    describe('instantiate', function () {
        beforeEach(function () {
            sandbox.stub(settingsCache, 'get').withArgs('permalinks').returns('/:slug/');

            sandbox.stub(common.events, 'emit');
            sandbox.stub(common.events, 'on');

            sandbox.spy(CollectionRouter.prototype, 'mountRoute');
            sandbox.spy(CollectionRouter.prototype, 'mountRouter');
        });

        afterEach(function () {
            sandbox.restore();
        });

        it('default', function () {
            const collectionRouter = new CollectionRouter('/', {permalink: '/:slug/'});

            should.exist(collectionRouter.router);

            collectionRouter.getFilter().should.eql('page:false');
            collectionRouter.getType().should.eql('posts');
            collectionRouter.templates.should.eql([]);
            collectionRouter.getPermalinks().getValue().should.eql('/:slug/');

            common.events.emit.calledOnce.should.be.true();
            common.events.emit.calledWith('router.created', collectionRouter).should.be.true();

            common.events.on.called.should.be.false();

            collectionRouter.mountRoute.callCount.should.eql(3);

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

        it('collection lives under /blog/', function () {
            const collectionRouter = new CollectionRouter('/blog/', {permalink: '/blog/:year/:slug/'});

            should.exist(collectionRouter.router);

            collectionRouter.getFilter().should.eql('page:false');
            collectionRouter.getType().should.eql('posts');
            collectionRouter.templates.should.eql([]);
            collectionRouter.getPermalinks().getValue().should.eql('/blog/:year/:slug/');

            common.events.emit.calledOnce.should.be.true();
            common.events.emit.calledWith('router.created', collectionRouter).should.be.true();

            common.events.on.called.should.be.false();

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
            const collectionRouter = new CollectionRouter('/', {permalink: '/:slug/', filter: 'featured:true'});

            collectionRouter.getFilter().should.eql('featured:true');
        });

        it('permalink placeholder', function () {
            const collectionRouter = new CollectionRouter('/magic/', {permalink: '/magic/{globals.permalinks}/'});

            collectionRouter.getPermalinks().getValue().should.eql('/magic/:slug/');
            common.events.on.calledOnce.should.be.true();
        });

        it('permalink placeholder', function () {
            const collectionRouter = new CollectionRouter('/magic/', {permalink: '{globals.permalinks}'});

            collectionRouter.getPermalinks().getValue().should.eql('/:slug/');
        });

        it('with templates', function () {
            const collectionRouter = new CollectionRouter('/magic/', {permalink: '/:slug/', template: ['home', 'index']});

            // they are getting reversed because we unshift the templates in the helper
            collectionRouter.templates.should.eql(['index', 'home']);
        });
    });

    describe('permalink in database changes', function () {
        beforeEach(function () {
            sandbox.stub(settingsCache, 'get').withArgs('permalinks').returns('/:slug/');

            sandbox.stub(common.events, 'emit');
            sandbox.stub(common.events, 'on');

            sandbox.spy(CollectionRouter.prototype, 'mountRoute');
            sandbox.spy(CollectionRouter.prototype, 'unmountRoute');
        });

        afterEach(function () {
            sandbox.restore();
        });

        it('permalink placeholder: flat', function () {
            const collectionRouter = new CollectionRouter('/magic/', {permalink: '{globals.permalinks}'});

            collectionRouter.mountRoute.callCount.should.eql(3);
            collectionRouter.unmountRoute.callCount.should.eql(0);

            collectionRouter.getPermalinks().getValue().should.eql('/:slug/');

            settingsCache.get.withArgs('permalinks').returns('/:primary_author/:slug/');

            common.events.on.args[0][1]();

            collectionRouter.mountRoute.callCount.should.eql(4);
            collectionRouter.unmountRoute.callCount.should.eql(1);

            collectionRouter.getPermalinks().getValue().should.eql('/:primary_author/:slug/');
        });

        it('permalink placeholder: complex', function () {
            const collectionRouter = new CollectionRouter('/animals/', {permalink: '/animals/{globals.permalinks}/'});

            collectionRouter.getPermalinks().getValue().should.eql('/animals/:slug/');
            settingsCache.get.withArgs('permalinks').returns('/:primary_author/:slug/');

            common.events.on.args[0][1]();

            collectionRouter.getPermalinks().getValue().should.eql('/animals/:primary_author/:slug/');
        });
    });
});
