const should = require('should');
const sinon = require('sinon');
const testUtils = require('../../../../../utils');
const configUtils = require('../../../../../utils/configUtils');
const api = require('../../../../../../core/frontend/services/proxy').api;
const controllers = require('../../../../../../core/frontend/services/routing/controllers');
const renderer = require('../../../../../../core/frontend/services/rendering');
const urlService = require('../../../../../../core/server/services/url');
const urlUtils = require('../../../../../../core/shared/url-utils');

describe('Unit - services/routing/controllers/previews', function () {
    let renderStub;
    let req;
    let res;
    let post;
    let apiResponse;

    function failTest(done) {
        return function (err) {
            should.exist(err);
            done(err);
        };
    }

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
            member_status: undefined
        }).resolves(apiResponse);

        sinon.stub(api, 'previews').get(() => {
            return {
                read: previewStub
            };
        });
    });

    it('should render post', function (done) {
        controllers.previews(req, res, failTest(done)).then(function () {
            renderStub.called.should.be.true();
            done();
        }).catch(done);
    });
});
