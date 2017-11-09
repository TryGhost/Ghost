var should = require('should'),
    sinon = require('sinon'),
    Promise = require('bluebird'),
    _ = require('lodash'),

    // Stuff we are testing
    channelsParentRouter = require('../../../../server/services/channels'),
    api = require('../../../../server/api'),
    themes = require('../../../../server/themes'),
    sandbox = sinon.sandbox.create();

/**
 * Note: this tests the following all in one go:
 * - ChannelS Router services/route/channels-router.js
 * - Channel Router services/channel/router.js
 * - Channel Controller controllers/channel.js
 * - Channel Renderer controllers/frontend/render-channel.js
 * This is because the refactor is in progress!
 */
describe('Channels', function () {
    var channelsRouter, req, res, hasTemplateStub, themeConfigStub;

    // Initialise 'req' with the bare minimum properties
    function setupRequest() {
        req = {
            method: 'get'
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
            redirect: sandbox.spy(),
            locals: {
                // Fake the ghost locals middleware, which doesn't happen when calling a channel router directly
                relativeUrl: props.url
            }
        };

        res.render = function (view, data) {
            try {
                assertions.call(this, view, data);
                res.redirect.called.should.be.false();
                done();
            } catch (err) {
                done(err);
            }
        };

        _.extend(req, props);

        channelsRouter(req, res, failTest(done));
    }

    // Run a test which should result in a redirect
    function testChannelRedirect(props, assertions, done) {
        res = {
            render: sandbox.spy(),
            set: sandbox.spy(),
            locals: {
                // Fake the ghost locals middleware, which doesn't happen when calling a channel router directly
                relativeUrl: props.url
            }
        };

        res.redirect = function (status, path) {
            try {
                assertions.call(this, status, path);
                res.render.called.should.be.false();
                done();
            } catch (err) {
                done(err);
            }
        };

        _.extend(req, props);

        channelsRouter(req, res, failTest(done));
    }

    // Run a test which should result in next() being called
    function testChannelNext(props, assertions, done) {
        res = {
            redirect: sandbox.spy(),
            render: sandbox.spy(),
            set: sandbox.spy(),
            locals: {
                // Fake the ghost locals middleware, which doesn't happen when calling a channel router directly
                relativeUrl: props.url
            }
        };

        _.extend(req, props);

        channelsRouter(req, res, function (empty) {
            try {
                assertions.call(this, empty);
                res.redirect.called.should.be.false();
                res.render.called.should.be.false();
                done();
            } catch (err) {
                done(err);
            }
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

    // Ensure hasTemplate returns values
    function setupActiveTheme() {
        hasTemplateStub = sandbox.stub().returns(false);
        hasTemplateStub.withArgs('index').returns(true);

        themeConfigStub = sandbox.stub().withArgs('posts_per_page').returns(5);

        sandbox.stub(themes, 'getActive').returns({
            hasTemplate: hasTemplateStub,
            config: themeConfigStub
        });
    }

    before(function () {
        // We don't overwrite this, so only do it once
        channelsRouter = channelsParentRouter.router();
    });

    afterEach(function () {
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

                should.exist(this.locals);
                this.locals.should.have.property('context').which.is.an.Array();
                this.locals.context.should.containEql('index');

                postAPIStub.calledOnce.should.be.true();
                postAPIStub.calledWith({page: 1, limit: 5, include: 'author,tags'}).should.be.true();
            }, done);
        });

        it('should render the first page of the index channel using home.hbs if available', function (done) {
            hasTemplateStub.withArgs('home').returns(true);

            testChannelRender({url: '/'}, function (view) {
                should.exist(view);
                view.should.eql('home');

                should.exist(this.locals);
                this.locals.should.have.property('context').which.is.an.Array();
                this.locals.context.should.containEql('index');

                postAPIStub.calledOnce.should.be.true();
                postAPIStub.calledWith({page: 1, limit: 5, include: 'author,tags'}).should.be.true();
            }, done);
        });

        describe('Paged', function () {
            it('should render the second page of the index channel', function (done) {
                testChannelRender({url: '/page/2/'}, function (view) {
                    should.exist(view);
                    view.should.eql('index');

                    should.exist(this.locals);
                    this.locals.should.have.property('context').which.is.an.Array();
                    this.locals.context.should.containEql('index');

                    postAPIStub.calledOnce.should.be.true();
                    postAPIStub.calledWith({page: 2, limit: 5, include: 'author,tags'}).should.be.true();
                }, done);
            });

            it('should use index.hbs for second page even if home.hbs is available', function (done) {
                testChannelRender({url: '/page/2/'}, function (view) {
                    should.exist(view);
                    view.should.eql('index');

                    should.exist(this.locals);
                    this.locals.should.have.property('context').which.is.an.Array();
                    this.locals.context.should.containEql('index');

                    postAPIStub.calledOnce.should.be.true();
                    postAPIStub.calledWith({page: 2, limit: 5, include: 'author,tags'}).should.be.true();
                }, done);
            });

            it('should render the third page of the index channel', function (done) {
                testChannelRender({url: '/page/3/'}, function (view) {
                    should.exist(view);
                    view.should.eql('index');

                    should.exist(this.locals);
                    this.locals.should.have.property('context').which.is.an.Array();
                    this.locals.context.should.containEql('index');

                    postAPIStub.calledOnce.should.be.true();
                    postAPIStub.calledWith({page: 3, limit: 5, include: 'author,tags'}).should.be.true();
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

                should.exist(this.locals);
                this.locals.should.have.property('context').which.is.an.Array();
                this.locals.context.should.containEql('tag');

                postAPIStub.calledOnce.should.be.true();
                postAPIStub.calledWith({filter: 'tags:\'my-tag\'+tags.visibility:public', page: 1, limit: 5, include: 'author,tags'}).should.be.true();
                tagAPIStub.calledOnce.should.be.true();
                tagAPIStub.calledWith({slug: 'my-tag', visibility: 'public'}).should.be.true();
            }, done);
        });

        it('should render the first page of the tag channel using tag.hbs by default', function (done) {
            hasTemplateStub.withArgs('tag').returns(true);

            testChannelRender({url: '/tag/my-tag/'}, function (view) {
                should.exist(view);
                view.should.eql('tag');

                should.exist(this.locals);
                this.locals.should.have.property('context').which.is.an.Array();
                this.locals.context.should.containEql('tag');

                postAPIStub.calledOnce.should.be.true();
                postAPIStub.calledWith({filter: 'tags:\'my-tag\'+tags.visibility:public', page: 1, limit: 5, include: 'author,tags'}).should.be.true();
                tagAPIStub.calledOnce.should.be.true();
                tagAPIStub.calledWith({slug: 'my-tag', visibility: 'public'}).should.be.true();
            }, done);
        });

        it('should render the first page of the tag channel using tag-:slug.hbs if available', function (done) {
            hasTemplateStub.withArgs('tag').returns(true);
            hasTemplateStub.withArgs('tag-my-tag').returns(true);

            testChannelRender({url: '/tag/my-tag/'}, function (view) {
                should.exist(view);
                view.should.eql('tag-my-tag');

                should.exist(this.locals);
                this.locals.should.have.property('context').which.is.an.Array();
                this.locals.context.should.containEql('tag');

                postAPIStub.calledOnce.should.be.true();
                postAPIStub.calledWith({filter: 'tags:\'my-tag\'+tags.visibility:public', page: 1, limit: 5, include: 'author,tags'}).should.be.true();
                tagAPIStub.calledOnce.should.be.true();
                tagAPIStub.calledWith({slug: 'my-tag', visibility: 'public'}).should.be.true();
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
                hasTemplateStub.withArgs('tag').returns(true);

                testChannelRender({url: '/tag/my-tag/page/2/'}, function (view) {
                    should.exist(view);
                    view.should.eql('tag');

                    should.exist(this.locals);
                    this.locals.should.have.property('context').which.is.an.Array();
                    this.locals.context.should.containEql('tag');

                    postAPIStub.calledOnce.should.be.true();
                    postAPIStub.calledWith({filter: 'tags:\'my-tag\'+tags.visibility:public', page: 2, limit: 5, include: 'author,tags'}).should.be.true();
                    tagAPIStub.calledOnce.should.be.true();
                    tagAPIStub.calledWith({slug: 'my-tag', visibility: 'public'}).should.be.true();
                }, done);
            });

            it('should use tag-:slug.hbs to render the tag channel if available', function (done) {
                hasTemplateStub.withArgs('tag').returns(true);
                hasTemplateStub.withArgs('tag-my-tag').returns(true);

                testChannelRender({url: '/tag/my-tag/page/2/'}, function (view) {
                    should.exist(view);
                    view.should.eql('tag-my-tag');

                    should.exist(this.locals);
                    this.locals.should.have.property('context').which.is.an.Array();
                    this.locals.context.should.containEql('tag');

                    postAPIStub.calledOnce.should.be.true();
                    postAPIStub.calledWith({filter: 'tags:\'my-tag\'+tags.visibility:public', page: 2, limit: 5, include: 'author,tags'}).should.be.true();
                    tagAPIStub.calledOnce.should.be.true();
                    tagAPIStub.calledWith({slug: 'my-tag', visibility: 'public'}).should.be.true();
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

                    should.exist(this.locals);
                    this.locals.should.have.property('context').which.is.an.Array();
                    this.locals.context.should.containEql('tag');

                    postAPIStub.calledOnce.should.be.true();
                    postAPIStub.calledWith({filter: 'tags:\'my-tag\'+tags.visibility:public', page: 3, limit: 5, include: 'author,tags'}).should.be.true();
                    tagAPIStub.calledOnce.should.be.true();
                    tagAPIStub.calledWith({slug: 'my-tag', visibility: 'public'}).should.be.true();
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
                    path.should.eql('/ghost/#/settings/tags/my-tag/');
                    postAPIStub.called.should.be.false();
                }, done);
            });
        });
    });
});
