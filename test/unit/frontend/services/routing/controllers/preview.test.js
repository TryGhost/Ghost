const should = require('should');
const sinon = require('sinon');
const Promise = require('bluebird');
const testUtils = require('../../../../../utils');
const configUtils = require('../../../../../utils/configUtils');
const api = require('../../../../../../core/server/api');
const controllers = require('../../../../../../core/frontend/services/routing/controllers');
const helpers = require('../../../../../../core/frontend/services/routing/helpers');
const urlService = require('../../../../../../core/server/services/url');
const urlUtils = require('../../../../../../core/shared/url-utils');
const EDITOR_URL = '/#/editor/post/';

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

    describe('v2', function () {
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
                    apiVersion: 'v2'
                },
                render: sinon.spy(),
                redirect: sinon.spy(),
                set: sinon.spy()
            };

            secureStub = sinon.stub();

            sinon.stub(urlUtils, 'redirectToAdmin');
            sinon.stub(urlUtils, 'redirect301');
            sinon.stub(urlService, 'getUrlByResourceId');

            sinon.stub(helpers, 'secure').get(function () {
                return secureStub;
            });

            renderStub = sinon.stub();
            sinon.stub(helpers, 'renderEntry').get(function () {
                return function () {
                    return renderStub;
                };
            });

            previewStub = sinon.stub();
            previewStub.withArgs({
                uuid: req.params.uuid,
                status: 'all',
                include: 'authors,tags'
            }).resolves(apiResponse);

            sinon.stub(api.v2, 'preview').get(() => {
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

    describe('canary', function () {
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

            sinon.stub(helpers, 'secure').get(function () {
                return secureStub;
            });

            renderStub = sinon.stub();
            sinon.stub(helpers, 'renderEntry').get(function () {
                return function () {
                    return renderStub;
                };
            });

            previewStub = sinon.stub();
            previewStub.withArgs({
                uuid: req.params.uuid,
                status: 'all',
                include: 'authors,tags'
            }).resolves(apiResponse);

            sinon.stub(api.canary, 'preview').get(() => {
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

    describe('v3', function () {
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
                    apiVersion: 'v3'
                },
                render: sinon.spy(),
                redirect: sinon.spy(),
                set: sinon.spy()
            };

            secureStub = sinon.stub();

            sinon.stub(urlUtils, 'redirectToAdmin');
            sinon.stub(urlUtils, 'redirect301');
            sinon.stub(urlService, 'getUrlByResourceId');

            sinon.stub(helpers, 'secure').get(function () {
                return secureStub;
            });

            renderStub = sinon.stub();
            sinon.stub(helpers, 'renderEntry').get(function () {
                return function () {
                    return renderStub;
                };
            });

            previewStub = sinon.stub();
            previewStub.withArgs({
                uuid: req.params.uuid,
                status: 'all',
                include: 'authors,tags'
            }).resolves(apiResponse);

            sinon.stub(api.v3, 'preview').get(() => {
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
});
