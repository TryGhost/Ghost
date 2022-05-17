const errors = require('@tryghost/errors');
const should = require('should');
const sinon = require('sinon');
const path = require('path');
const ampController = require('../../../../../core/frontend/apps/amp/lib/router');
const urlService = require('../../../../../core/server/services/url');
const renderer = require('../../../../../core/frontend/services/rendering');
const dataService = require('../../../../../core/frontend/services/data');
const testUtils = require('../../../../utils');
const configUtils = require('../../../../utils/configUtils');

// Helper function to prevent unit tests
// from failing via timeout when they
// should just immediately fail
function failTest(done) {
    return function (err) {
        done(err);
    };
}

describe('Unit - apps/amp/lib/router', function () {
    let res;
    let req;
    let defaultPath;
    let rendererStub;

    beforeEach(function () {
        rendererStub = sinon.stub();

        sinon.stub(renderer, 'renderer').get(function () {
            return rendererStub;
        });

        res = {
            render: sinon.spy(),
            locals: {
                context: ['amp', 'post']
            }
        };

        req = {
            route: {path: '/'},
            query: {r: ''},
            params: {},
            amp: {},
            body: {
                post: {
                    title: 'test'
                }
            }
        };

        defaultPath = path.join(configUtils.config.get('paths').appRoot, '/core/frontend/apps/amp/lib/views/amp.hbs');
    });

    afterEach(function () {
        sinon.restore();
    });

    describe('fn: renderer', function () {
        it('should render default amp page when theme has no amp template', function (done) {
            renderer.renderer.callsFake(function (_req, _res, data) {
                _res.routerOptions.defaultTemplate.should.eql(defaultPath);
                data.should.eql({post: {title: 'test'}});
                done();
            });

            ampController.renderer(req, res, failTest(done));
        });

        it('throws 404 when req.body has no post', function (done) {
            req.body = {};

            ampController.renderer(req, res, function (err) {
                (err instanceof errors.NotFoundError).should.be.true();
                renderer.renderer.called.should.be.false();
                done();
            });
        });
    });

    describe('fn: getPostData', function () {
        let entryLookupStub;
        let post;

        beforeEach(function () {
            post = testUtils.DataGenerator.forKnex.createPost({slug: 'welcome'});

            res = {
                locals: {}
            };

            req = {};

            entryLookupStub = sinon.stub();

            sinon.stub(dataService, 'entryLookup').get(function () {
                return entryLookupStub;
            });

            sinon.stub(urlService, 'getPermalinkByUrl');
        });

        afterEach(function () {
            sinon.restore();
        });

        it('should successfully get the post data from slug', function (done) {
            res.locals.relativeUrl = req.originalUrl = '/welcome/amp';

            urlService.getPermalinkByUrl.withArgs('/welcome/').returns('/:slug/');

            dataService.entryLookup.withArgs('/welcome/', {permalinks: '/:slug/', query: {controller: 'postsPublic', resource: 'posts'}})
                .resolves({
                    entry: post
                });

            ampController.getPostData(req, res, function () {
                req.body.post.should.be.eql(post);
                done();
            });
        });

        it('subdirectory: should successfully get the post data from slug', function (done) {
            req.originalUrl = '/blog/welcome/amp';
            res.locals.relativeUrl = '/welcome/amp';

            urlService.getPermalinkByUrl.withArgs('/welcome/').returns('/:slug/');

            dataService.entryLookup.withArgs('/welcome/', {permalinks: '/:slug/', query: {controller: 'postsPublic', resource: 'posts'}}).resolves({
                entry: post
            });

            ampController.getPostData(req, res, function () {
                req.body.post.should.be.eql(post);
                done();
            });
        });

        it('should return error if entrylookup returns NotFoundError', function (done) {
            res.locals.relativeUrl = req.originalUrl = '/welcome/amp';

            urlService.getPermalinkByUrl.withArgs('/welcome/').returns('/:slug/');

            dataService.entryLookup.withArgs('/welcome/', {permalinks: '/:slug/', query: {controller: 'postsPublic', resource: 'posts'}})
                .rejects(new errors.NotFoundError());

            ampController.getPostData(req, res, function (err) {
                (err instanceof errors.NotFoundError).should.be.true();
                done();
            });
        });
    });
});
