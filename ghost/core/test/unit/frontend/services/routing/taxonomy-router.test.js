const assert = require('node:assert/strict');
const {assertExists} = require('../../../../utils/assertions');
const sinon = require('sinon');
const settingsCache = require('../../../../../core/shared/settings-cache');
const controllers = require('../../../../../core/frontend/services/routing/controllers');
const TaxonomyRouter = require('../../../../../core/frontend/services/routing/taxonomy-router');

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

        assertExists(taxonomyRouter.router);
        assertExists(taxonomyRouter.rssRouter);

        assert.equal(taxonomyRouter.taxonomyKey, 'tag');
        assert.equal(taxonomyRouter.getPermalinks().getValue(), '/tag/:slug/');

        sinon.assert.calledOnce(routerCreatedSpy);
        sinon.assert.calledWith(routerCreatedSpy, taxonomyRouter);

        sinon.assert.calledOnce(taxonomyRouter.mountRouter);
        assert.equal(taxonomyRouter.mountRouter.args[0][0], '/tag/:slug/');
        assert.equal(taxonomyRouter.mountRouter.args[0][1], taxonomyRouter.rssRouter.router());

        sinon.assert.calledThrice(taxonomyRouter.mountRoute);

        // permalink route
        assert.equal(taxonomyRouter.mountRoute.args[0][0], '/tag/:slug/');
        assert.equal(taxonomyRouter.mountRoute.args[0][1], controllers.channel);

        // pagination feature
        assert.equal(taxonomyRouter.mountRoute.args[1][0], '/tag/:slug/page/:page(\\d+)');
        assert.equal(taxonomyRouter.mountRoute.args[1][1], controllers.channel);

        // edit feature
        assert.equal(taxonomyRouter.mountRoute.args[2][0], '/tag/:slug/edit');
        // We'd can't compare to `taxonomyRouter._redirectEditOption.bind(taxonomyRouter)`, so this is the next best thing.
        assert(typeof taxonomyRouter.mountRoute.args[2][1] === 'function');
        assert(taxonomyRouter.mountRoute.args[2][1].name.includes('_redirectEditOption'));
    });

    it('_prepareContext behaves as expected', function () {
        const taxonomyRouter = new TaxonomyRouter('tag', '/tag/:slug/', RESOURCE_CONFIG, routerCreatedSpy);
        taxonomyRouter._prepareContext(req, res, next);
        sinon.assert.calledOnce(next);

        assert.deepEqual(res.routerOptions, {
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
