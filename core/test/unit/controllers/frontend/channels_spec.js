/*globals describe, before, beforeEach, afterEach, it*/
var should   = require('should'),
    sinon    = require('sinon'),
    Promise  = require('bluebird'),
    _        = require('lodash'),

// Stuff we are testing
    channels = require('../../../../server/controllers/frontend/channels'),
    api      = require('../../../../server/api'),

    configUtils = require('../../../utils/configUtils'),

    sandbox = sinon.sandbox.create();

describe('Channels', function () {
    var channelRouter, req, res;

    // Initialise 'req' with the bare minimum properties
    function setupRequest() {
        req = {
            method: 'get',
            app: {
                get: sandbox.stub().returns('casper')
            }
        };
    }

    // Prevent unit tests from failing via timeout when they should just immediately fail
    function failTest(done) {
        return function (err) {
            done(err || 'Next was called with no Error');
        };
    }

    // Run a test which should result in a render
    function testChannelRender(props, assertions, done) {
        res = {
            redirect: sandbox.spy()
        };

        res.render = function (view) {
            assertions(view);
            res.redirect.called.should.be.false();
            done();
        };

        _.extend(req, props);

        channelRouter(req, res, failTest(done));
    }

    // Run a test which should result in a redirect
    function testChannelRedirect(props, assertions, done) {
        res = {
            render: sandbox.spy(),
            set: sandbox.spy()
        };

        res.redirect = function (status, path) {
            assertions(status, path);
            res.render.called.should.be.false();
            done();
        };

        _.extend(req, props);

        channelRouter(req, res, failTest(done));
    }

    // Run a test which should result in next() being called
    function testChannelNext(props, assertions, done) {
        res = {
            redirect: sandbox.spy(),
            render: sandbox.spy(),
            set: sandbox.spy()
        };

        _.extend(req, props);

        channelRouter(req, res, function (empty) {
            assertions(empty);
            res.redirect.called.should.be.false();
            res.render.called.should.be.false();
            done();
        });
    }

    // Run a test which results in next being called with an error
    function testChannelError(props, assertions, done) {
        testChannelNext(props, function (error) {
            should.exist(error);
            assertions(error);
        }, done);
    }

    // Run a test which results in an explicit 404
    function testChannel404(props, done) {
        testChannelError(props, function (error) {
            error.errorType.should.eql('NotFoundError');
            error.statusCode.should.eql(404);
        }, done);
    }

    before(function () {
        // We don't overwrite this, so only do it once
        channelRouter = channels.router();
    });

    afterEach(function () {
        configUtils.restore();
        sandbox.restore();
    });

    describe('Index', function () {
        var postAPIStub;

        // Stub the posts api
        function setupPostsAPIStub() {
            postAPIStub = sandbox.stub(api.posts, 'browse', function () {
                return Promise.resolve({posts: [{}], meta: {pagination: {pages: 3}}});
            });
        }

        // Return basic paths for the activeTheme
        function setupActiveTheme() {
            configUtils.set({paths: {availableThemes: {casper: {
                'index.hbs': '/content/themes/casper/index.hbs'
            }}}});
        }

        beforeEach(function () {
            // Setup Env for tests
            setupPostsAPIStub();
            setupActiveTheme();
            setupRequest();
        });

        it('should render the first page of the index channel', function (done) {
            testChannelRender({url: '/'}, function (view) {
                should.exist(view);
                view.should.eql('index');
                postAPIStub.calledOnce.should.be.true();
            }, done);
        });

        it('should render the first page of the index channel using home.hbs if available', function (done) {
            configUtils.set({paths: {availableThemes: {casper: {
                'index.hbs': '/content/themes/casper/index.hbs',
                'home.hbs': '/content/themes/casper/home.hbs'
            }}}});

            testChannelRender({url: '/'}, function (view) {
                should.exist(view);
                view.should.eql('home');
                postAPIStub.calledOnce.should.be.true();
            }, done);
        });

        describe('Paged', function () {
            it('should render the second page of the index channel', function (done) {
                testChannelRender({url: '/page/2/'}, function (view) {
                    should.exist(view);
                    view.should.eql('index');
                    postAPIStub.calledOnce.should.be.true();
                }, done);
            });

            it('should use index.hbs for second page even if home.hbs is available', function (done) {
                configUtils.set({paths: {availableThemes: {casper: {
                    'index.hbs': '/content/themes/casper/index.hbs',
                    'home.hbs': '/content/themes/casper/home.hbs'
                }}}});

                testChannelRender({url: '/page/2/'}, function (view) {
                    should.exist(view);
                    view.should.eql('index');
                    postAPIStub.calledOnce.should.be.true();
                }, done);
            });

            it('should render the third page of the index channel', function (done) {
                testChannelRender({url: '/page/3/'}, function (view) {
                    should.exist(view);
                    view.should.eql('index');
                    postAPIStub.calledOnce.should.be.true();
                }, done);
            });

            it('should redirect /page/1/ to /', function (done) {
                testChannelRedirect({url: '/page/1/'}, function (status, path) {
                    status.should.eql(301);
                    path.should.eql('/');

                    res.set.called.should.be.true();
                    postAPIStub.called.should.be.false();
                }, done);
            });

            it('should 404 for /page/0/', function (done) {
                testChannel404({url: '/page/0/'}, done);
            });

            it('should 404 for /page/4/', function (done) {
                testChannel404({url: '/page/4/'}, done);
            });
        });

        describe('RSS', function () {
            it('should redirect /feed/ to /rss/', function (done) {
                testChannelRedirect({url: '/feed/'}, function (status, path) {
                    status.should.eql(301);
                    path.should.eql('/rss/');

                    res.set.called.should.be.true();
                    postAPIStub.called.should.be.false();
                }, done);
            });

            it('should redirect /rss/1/ to /rss/', function (done) {
                testChannelRedirect({url: '/rss/1/'}, function (status, path) {
                    status.should.eql(301);
                    path.should.eql('/rss/');

                    res.set.called.should.be.true();
                    postAPIStub.called.should.be.false();
                }, done);
            });

            it('should 404 for /rss/0/', function (done) {
                testChannel404({url: '/rss/0/'}, done);
            });

            it('should 404 for /rss/4/', function (done) {
                testChannel404({url: '/rss/4/'}, done);
            });
        });

        describe('Edit', function () {
            it('should NOT redirect /edit/, should pass through', function (done) {
                testChannelNext({url: '/edit/'}, done);
            });
        });
    });

    describe('Tag', function () {
        var postAPIStub, tagAPIStub;

        // Stub the posts and tags api
        function setupAPIStubs() {
            postAPIStub = sandbox.stub(api.posts, 'browse', function () {
                return Promise.resolve({posts: [{}], meta: {pagination: {pages: 3}}});
            });

            tagAPIStub = sandbox.stub(api.tags, 'read', function () {
                return Promise.resolve({tags: [{}]});
            });
        }

        // Return basic paths for the activeTheme
        function setupActiveTheme() {
            configUtils.set({paths: {availableThemes: {casper: {
                'index.hbs': '/content/themes/casper/index.hbs'
            }}}});
        }

        beforeEach(function () {
            // Setup Env for tests
            setupAPIStubs();
            setupActiveTheme();
            setupRequest();
        });

        it('should render the first page of the tag channel using index.hbs by default', function (done) {
            testChannelRender({url: '/tag/my-tag/'}, function (view) {
                should.exist(view);
                view.should.eql('index');
                postAPIStub.calledOnce.should.be.true();
                tagAPIStub.calledOnce.should.be.true();
            }, done);
        });

        it('should render the first page of the tag channel using tag.hbs by default', function (done) {
            configUtils.set({paths: {availableThemes: {casper: {
                'index.hbs': '/content/themes/casper/index.hbs',
                'tag.hbs': '/content/themes/casper/tag.hbs'
            }}}});

            testChannelRender({url: '/tag/my-tag/'}, function (view) {
                should.exist(view);
                view.should.eql('tag');
                postAPIStub.calledOnce.should.be.true();
                tagAPIStub.calledOnce.should.be.true();
            }, done);
        });

        it('should render the first page of the tag channel using tag-:slug.hbs if available', function (done) {
            configUtils.set({paths: {availableThemes: {casper: {
                'index.hbs': '/content/themes/casper/index.hbs',
                'tag.hbs': '/content/themes/casper/tag.hbs',
                'tag-my-tag.hbs': '/content/themes/casper/tag-my-tag.hbs'
            }}}});

            testChannelRender({url: '/tag/my-tag/'}, function (view) {
                should.exist(view);
                view.should.eql('tag-my-tag');
                postAPIStub.calledOnce.should.be.true();
                tagAPIStub.calledOnce.should.be.true();
            }, done);
        });

        describe('Paged', function () {
            it('should render the second page of the tag channel', function (done) {
                testChannelRender({url: '/tag/my-tag/page/2/'}, function (view) {
                    should.exist(view);
                    view.should.eql('index');
                    postAPIStub.calledOnce.should.be.true();
                }, done);
            });

            it('should use tag.hbs to render the tag channel if available', function (done) {
                configUtils.set({paths: {availableThemes: {casper: {
                    'index.hbs': '/content/themes/casper/index.hbs',
                    'tag.hbs': '/content/themes/casper/tag.hbs'
                }}}});

                testChannelRender({url: '/tag/my-tag/page/2/'}, function (view) {
                    should.exist(view);
                    view.should.eql('tag');
                    postAPIStub.calledOnce.should.be.true();
                }, done);
            });

            it('should use tag-:slug.hbs to render the tag channel if available', function (done) {
                configUtils.set({paths: {availableThemes: {casper: {
                    'index.hbs': '/content/themes/casper/index.hbs',
                    'tag.hbs': '/content/themes/casper/tag.hbs',
                    'tag-my-tag.hbs': '/content/themes/casper/tag-my-tag.hbs'
                }}}});

                testChannelRender({url: '/tag/my-tag/page/2/'}, function (view) {
                    should.exist(view);
                    view.should.eql('tag-my-tag');
                    postAPIStub.calledOnce.should.be.true();
                }, done);
            });

            it('should render the second page of the tag channel', function (done) {
                testChannelRender({url: '/tag/my-tag/page/2/'}, function (view) {
                    should.exist(view);
                    view.should.eql('index');
                    postAPIStub.calledOnce.should.be.true();
                }, done);
            });

            it('should render the third page of the tag channel', function (done) {
                testChannelRender({url: '/tag/my-tag/page/3/'}, function (view) {
                    should.exist(view);
                    view.should.eql('index');
                    postAPIStub.calledOnce.should.be.true();
                }, done);
            });

            it('should redirect /tag/my-tag/page/1/ to /tag/my-tag/', function (done) {
                testChannelRedirect({url: '/tag/my-tag/page/1/'}, function (status, path) {
                    status.should.eql(301);
                    path.should.eql('/tag/my-tag/');

                    res.set.called.should.be.true();
                    postAPIStub.called.should.be.false();
                }, done);
            });

            it('should 404 for /tag/my-tag/page/0/', function (done) {
                testChannel404({url: '/tag/my-tag/page/0/'}, done);
            });

            it('should 404 for /tag/my-tag/page/4/', function (done) {
                testChannel404({url: '/tag/my-tag/page/4/'}, done);
            });
        });

        describe('RSS', function () {
            it('should redirect /tag/my-tag/feed/ to /tag/my-tag/rss/', function (done) {
                testChannelRedirect({url: '/tag/my-tag/feed/'}, function (status, path) {
                    status.should.eql(301);
                    path.should.eql('/tag/my-tag/rss/');

                    res.set.called.should.be.true();
                    postAPIStub.called.should.be.false();
                }, done);
            });

            it('should redirect /tag/my-tag/rss/1/ to /tag/my-tag/rss/', function (done) {
                testChannelRedirect({url: '/tag/my-tag/rss/1/'}, function (status, path) {
                    status.should.eql(301);
                    path.should.eql('/tag/my-tag/rss/');

                    res.set.called.should.be.true();
                    postAPIStub.called.should.be.false();
                }, done);
            });

            it('should 404 for /tag/my-tag/rss/0/', function (done) {
                testChannel404({url: '/tag/my-tag/rss/0/'}, done);
            });

            it('should 404 for /tag/my-tag/rss/4/', function (done) {
                testChannel404({url: '/tag/my-tag/rss/4/'}, done);
            });
        });

        describe('Edit', function () {
            it('should redirect /edit/ to ghost admin', function (done) {
                testChannelRedirect({url: '/tag/my-tag/edit/'}, function (path) {
                    path.should.eql('/ghost/settings/tags/my-tag/');
                    postAPIStub.called.should.be.false();
                }, done);
            });
        });
    });
});
