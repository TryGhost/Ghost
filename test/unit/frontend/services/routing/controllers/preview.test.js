const should = require('should');
const sinon = require('sinon');
const Promise = require('bluebird');
const testUtils = require('../../../../../utils');
const configUtils = require('../../../../../utils/configUtils');
const api = require('../../../../../../core/server/api').canary;
const controllers = require('../../../../../../core/frontend/services/routing/controllers');
const renderer = require('../../../../../../core/frontend/services/rendering');
const urlService = require('../../../../../../core/server/services/url');
const urlUtils = require('../../../../../../core/shared/url-utils');

describe('Unit - services/routing/controllers/preview', function () {
    let secureStub;
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

    afterEach(function () {
        sinon.restore();
        configUtils.restore();
    });

    let previewStub;

    beforeEach(function () {
        post = testUtils.DataGenerator.forKnex.createPost({status: 'draft'});

        apiResponse = {
            preview: [post]
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
                query: {controller: 'preview', resource: 'preview'}
            },
            locals: {
                apiVersion: 'canary'
            },
            render: sinon.spy(),
            redirect: sinon.spy(),
            set: sinon.spy()
        };

        secureStub = sinon.stub();

        sinon.stub(urlUtils, 'redirectToAdmin');
        sinon.stub(urlUtils, 'redirect301');
        sinon.stub(urlService, 'getUrlByResourceId');

        sinon.stub(renderer, 'secure').get(function () {
            return secureStub;
        });

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
            include: 'authors,tags,tiers'
        }).resolves(apiResponse);

        sinon.stub(api, 'preview').get(() => {
            return {
                read: previewStub
            };
        });
    });

    it('should render post', function (done) {
        controllers.preview(req, res, failTest(done)).then(function () {
            renderStub.called.should.be.true();
            secureStub.called.should.be.true();
            done();
        }).catch(done);
    });
});
