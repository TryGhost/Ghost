var should = require('should'),
    sinon = require('sinon'),
    Promise = require('bluebird'),
    _ = require('lodash'),

    // Test utils
    configUtils = require('../../utils/configUtils'),
    markdownToMobiledoc = require('../../utils/fixtures/data-generator').markdownToMobiledoc,

    // Server requires
    api = require('../../../server/api'),
    controllers = require('../../../server/controllers'),
    themes = require('../../../server/themes'),

    sandbox = sinon.sandbox.create();

describe('Controllers', function () {
    var hasTemplateStub;

    afterEach(function () {
        sandbox.restore();
        configUtils.restore();
    });

    // Ensure hasTemplate returns values
    function setupActiveTheme() {
        hasTemplateStub = sandbox.stub().returns(false);
        hasTemplateStub.withArgs('post').returns(true);
        hasTemplateStub.withArgs('page').returns(true);

        sandbox.stub(themes, 'getActive').returns({
            hasTemplate: hasTemplateStub
        });
    }

    beforeEach(function () {
        setupActiveTheme();
    });

    // Helper function to prevent unit tests
    // from failing via timeout when they
    // should just immediately fail
    function failTest(done) {
        return function (err) {
            done(err);
        };
    }

    describe('preview', function () {
        var req, res, mockPosts = [{
            posts: [{
                status: 'draft',
                uuid: 'abc-1234-01',
                id: 1,
                title: 'Test static page',
                slug: 'test-static-page',
                mobiledoc: markdownToMobiledoc('Test static page content'),
                page: 1,
                author: {
                    id: 1,
                    name: 'Test User',
                    slug: 'test',
                    email: 'test@ghost.org'
                },
                url: '/test-static-page/'
            }]
        }, {
            posts: [{
                status: 'draft',
                uuid: 'abc-1234-02',
                id: 2,
                title: 'Test normal post',
                slug: 'test-normal-post',
                mobiledoc: markdownToMobiledoc('The test normal post content'),
                page: 0,
                author: {
                    id: 1,
                    name: 'Test User',
                    slug: 'test',
                    email: 'test@ghost.org'
                }
            }]
        }, {
            posts: [{
                status: 'published',
                uuid: 'abc-1234-03',
                id: 3,
                title: 'Getting started',
                slug: 'about',
                mobiledoc: markdownToMobiledoc('This is a blog post'),
                page: 0,
                published_at: new Date('2014/1/30').getTime(),
                author: {
                    id: 1,
                    name: 'Test User',
                    slug: 'test',
                    email: 'test@ghost.org'
                },
                url: '/getting-started/'
            }]
        }];

        beforeEach(function () {
            sandbox.stub(api.posts, 'read', function (args) {
                var post = _.find(mockPosts, function (mock) {
                    return mock.posts[0].uuid === args.uuid;
                });
                return Promise.resolve(post || {posts: []});
            });

            req = {
                path: '/', params: {}, route: {}
            };

            res = {
                locals: {},
                render: sinon.spy(),
                redirect: sinon.spy(),
                set: sinon.spy()
            };
        });

        it('should render draft post', function (done) {
            req.params = {uuid: 'abc-1234-02'};
            res.render = function (view, context) {
                view.should.equal('post');
                should.exist(context.post);
                context.post.should.equal(mockPosts[1].posts[0]);

                done();
            };

            controllers.preview(req, res, failTest(done));
        });

        it('should render draft page', function (done) {
            req.params = {uuid: 'abc-1234-01'};
            res.render = function (view, context) {
                view.should.equal('page');
                should.exist(context.post);
                context.post.should.equal(mockPosts[0].posts[0]);

                done();
            };

            controllers.preview(req, res, failTest(done));
        });

        it('should call next if post is not found', function (done) {
            req.params = {uuid: 'abc-1234-04'};

            controllers.preview(req, res, function (err) {
                should.not.exist(err);
                res.render.called.should.be.false();
                res.redirect.called.should.be.false();
                res.set.called.should.be.false();

                done();
            });
        });

        it('should call redirect if post is published', function (done) {
            req.params = {uuid: 'abc-1234-03'};
            res.redirect = function (status, url) {
                res.render.called.should.be.false();
                res.set.called.should.be.true();
                status.should.eql(301);
                url.should.eql('/getting-started/');

                done();
            };

            controllers.preview(req, res, failTest(done));
        });

        it('should call redirect if /edit/ (options param) is detected', function (done) {
            req.params = {uuid: 'abc-1234-01', options: 'edit'};
            res.redirect = function (url) {
                res.render.called.should.be.false();
                res.set.called.should.be.false();
                url.should.eql('/ghost/#/editor/1/');

                done();
            };

            controllers.preview(req, res, failTest(done));
        });

        it('should call next for unknown options param detected', function (done) {
            req.params = {uuid: 'abc-1234-01', options: 'asdsad'};

            controllers.preview(req, res, function (err) {
                should.not.exist(err);
                res.render.called.should.be.false();
                res.redirect.called.should.be.false();
                res.set.called.should.be.false();

                done();
            });
        });
    });
});
