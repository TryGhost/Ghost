const sinon = require('sinon');
const assert = require('node:assert/strict');
const testUtils = require('../../../../../utils');
const configUtils = require('../../../../../utils/config-utils');
const api = require('../../../../../../core/frontend/services/proxy').api;
const controllers = require('../../../../../../core/frontend/services/routing/controllers');
const {routerManager} = require('../../../../../../core/frontend/services/routing');
const renderer = require('../../../../../../core/frontend/services/rendering');
const urlService = require('../../../../../../core/server/services/url');
const urlUtils = require('../../../../../../core/shared/url-utils');

describe('Unit - services/routing/controllers/previews', function () {
    let renderStub;
    let req;
    let res;
    let post;
    let apiResponse;

    afterEach(async function () {
        sinon.restore();
        await configUtils.restore();
    });

    let previewStub;

    beforeEach(function () {
        post = testUtils.DataGenerator.forKnex.createPost({status: 'draft'});

        apiResponse = {
            previews: [post]
        };

        req = {
            path: '/',
            params: {
                uuid: 'something'
            },
            route: {}
        };

        res = {
            routerOptions: {
                query: {controller: 'previews', resource: 'previews'}
            },
            locals: {},
            render: sinon.spy(),
            redirect: sinon.spy(),
            set: sinon.spy()
        };

        sinon.stub(urlUtils, 'redirectToAdmin');
        sinon.stub(urlUtils, 'redirect301');
        sinon.stub(urlService, 'getUrlByResourceId');

        renderStub = sinon.stub();
        sinon.stub(renderer, 'renderEntry').get(function () {
            return function () {
                return renderStub;
            };
        });

        previewStub = sinon.stub();
        previewStub.withArgs({
            uuid: req.params.uuid,
            status: 'all',
            include: 'authors,tags,tiers',
            member_status: undefined,
            member_tier: undefined
        }).resolves(apiResponse);

        sinon.stub(api, 'previews').get(() => {
            return {
                read: previewStub
            };
        });
    });

    it('should render post', async function () {
        const next = sinon.stub();
        await controllers.previews(req, res, next);
        sinon.assert.called(renderStub);
        sinon.assert.notCalled(next);
    });

    it('redirects a published preview using the real resource type, not "previews"', async function () {
        // The URL service routes by resource type; `previews` is not a routable
        // type, so it must resolve to the post's own type ('post'/'page').
        post.status = 'published';
        post.type = 'post';

        let capturedType;
        sinon.stub(routerManager, 'getUrlForResource').callsFake((resource) => {
            capturedType = resource.type;
            return 'http://127.0.0.1:2369/the-slug/';
        });

        const next = sinon.stub();
        await controllers.previews(req, res, next);

        sinon.assert.calledOnce(urlUtils.redirect301);
        assert.equal(capturedType, 'post', 'expected the post type, not "previews"');
    });
});
