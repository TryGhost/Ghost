const should = require('should'),
    sinon = require('sinon'),
    _ = require('lodash'),
    settingsCache = require('../../../../server/services/settings/cache'),
    common = require('../../../../server/lib/common'),
    controllers = require('../../../../server/services/routing/controllers'),
    TaxonomyRouter = require('../../../../server/services/routing/TaxonomyRouter'),
    RESOURCE_CONFIG = require('../../../../server/services/routing/assets/resource-config'),
    sandbox = sinon.sandbox.create();

describe('UNIT - services/routing/TaxonomyRouter', function () {
    let req, res, next;

    beforeEach(function () {
        sandbox.stub(settingsCache, 'get').withArgs('permalinks').returns('/:slug/');

        sandbox.stub(common.events, 'emit');
        sandbox.stub(common.events, 'on');

        sandbox.spy(TaxonomyRouter.prototype, 'mountRoute');
        sandbox.spy(TaxonomyRouter.prototype, 'mountRouter');

        req = sandbox.stub();
        res = sandbox.stub();
        next = sandbox.stub();

        res.locals = {};
    });

    afterEach(function () {
        sandbox.restore();
    });

    it('instantiate', function () {
        const taxonomyRouter = new TaxonomyRouter('tag', '/tag/:slug/');

        should.exist(taxonomyRouter.router);
        should.exist(taxonomyRouter.rssRouter);

        taxonomyRouter.taxonomyKey.should.eql('tag');
        taxonomyRouter.getPermalinks().getValue().should.eql('/tag/:slug/');

        common.events.emit.calledOnce.should.be.true();
        common.events.emit.calledWith('router.created', taxonomyRouter).should.be.true();

        taxonomyRouter.mountRouter.callCount.should.eql(1);
        taxonomyRouter.mountRouter.args[0][0].should.eql('/tag/:slug/');
        taxonomyRouter.mountRouter.args[0][1].should.eql(taxonomyRouter.rssRouter.router());

        taxonomyRouter.mountRoute.callCount.should.eql(3);

        // permalink route
        taxonomyRouter.mountRoute.args[0][0].should.eql('/tag/:slug/');
        taxonomyRouter.mountRoute.args[0][1].should.eql(controllers.channel);

        // pagination feature
        taxonomyRouter.mountRoute.args[1][0].should.eql('/tag/:slug/page/:page(\\d+)');
        taxonomyRouter.mountRoute.args[1][1].should.eql(controllers.channel);

        // edit feature
        taxonomyRouter.mountRoute.args[2][0].should.eql('/tag/:slug/edit');
        taxonomyRouter.mountRoute.args[2][1].should.eql(taxonomyRouter._redirectEditOption.bind(taxonomyRouter));
    });

    it('fn: _prepareContext', function () {
        const taxonomyRouter = new TaxonomyRouter('tag', '/tag/:slug/');
        taxonomyRouter._prepareContext(req, res, next);
        next.calledOnce.should.eql(true);

        res.routerOptions.should.eql({
            type: 'channel',
            name: 'tag',
            permalinks: '/tag/:slug/',
            resourceType: RESOURCE_CONFIG.QUERY.tag.resource,
            data: {tag: RESOURCE_CONFIG.QUERY.tag},
            filter: RESOURCE_CONFIG.TAXONOMIES.tag.filter,
            context: ['tag'],
            slugTemplate: true,
            identifier: taxonomyRouter.identifier
        });
    });
});
