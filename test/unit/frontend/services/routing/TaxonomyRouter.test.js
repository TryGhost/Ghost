const should = require('should');
const sinon = require('sinon');
const settingsCache = require('../../../../../core/shared/settings-cache');
const controllers = require('../../../../../core/frontend/services/routing/controllers');
const TaxonomyRouter = require('../../../../../core/frontend/services/routing/TaxonomyRouter');

const RESOURCE_CONFIG = require('../../../../../core/frontend/services/routing/config');

describe('UNIT - services/routing/TaxonomyRouter', function () {
    let req;
    let res;
    let next;
    let routerCreatedSpy;

    beforeEach(function () {
        sinon.stub(settingsCache, 'get').withArgs('permalinks').returns('/:slug/');

        routerCreatedSpy = sinon.spy();

        sinon.spy(TaxonomyRouter.prototype, 'mountRoute');
        sinon.spy(TaxonomyRouter.prototype, 'mountRouter');

        req = sinon.stub();
        res = sinon.stub();
        next = sinon.stub();

        res.locals = {};
    });

    afterEach(function () {
        sinon.restore();
    });

    it('instantiate', function () {
        const taxonomyRouter = new TaxonomyRouter('tag', '/tag/:slug/', {}, routerCreatedSpy);

        should.exist(taxonomyRouter.router);
        should.exist(taxonomyRouter.rssRouter);

        taxonomyRouter.taxonomyKey.should.eql('tag');
        taxonomyRouter.getPermalinks().getValue().should.eql('/tag/:slug/');

        routerCreatedSpy.calledOnce.should.be.true();
        routerCreatedSpy.calledWith(taxonomyRouter).should.be.true();

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

    it('_prepareContext behaves as expected', function () {
        const taxonomyRouter = new TaxonomyRouter('tag', '/tag/:slug/', RESOURCE_CONFIG, routerCreatedSpy);
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
