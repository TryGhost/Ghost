var should = require('should'),
    sinon = require('sinon'),
    moment = require('moment'),
    Promise = require('bluebird'),
    _ = require('lodash'),
    api = require('../../../../server/api'),
    frontend = require('../../../../server/controllers/frontend'),
    configUtils = require('../../../utils/configUtils'),
    themes = require('../../../../server/themes'),
    settingsCache = require('../../../../server/settings/cache'),
    markdownToMobiledoc = require('../../../utils/fixtures/data-generator').markdownToMobiledoc,
    sandbox = sinon.sandbox.create();

describe('Frontend Controller', function () {
    var adminEditPagePath = '/ghost/editor/',
        localSettingsCache = {},
        hasTemplateStub;

    function resetLocalSettingsCache() {
        localSettingsCache = {
            permalinks: '/:slug/',
            active_theme: 'casper'
        };
    }

    afterEach(function () {
        sandbox.restore();
        configUtils.restore();
    });

    // Ensure hasTemplate returns values
    function setupActiveTheme() {
        hasTemplateStub = sandbox.stub().returns(false);
        hasTemplateStub.withArgs('default').returns(true);
        hasTemplateStub.withArgs('index').returns(true);
        hasTemplateStub.withArgs('page').returns(true);
        hasTemplateStub.withArgs('page-about').returns(true);
        hasTemplateStub.withArgs('post').returns(true);

        sandbox.stub(themes, 'getActive').returns({
            hasTemplate: hasTemplateStub
        });

        sandbox.stub(settingsCache, 'get', function (key) {
            return localSettingsCache[key];
        });
    }

    beforeEach(function () {
        resetLocalSettingsCache();
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

    describe('single', function () {
        var req, res, mockPosts = [{
            posts: [{
                status: 'published',
                id: 1,
                title: 'Test static page',
                slug: 'test-static-page',
                mobiledoc: markdownToMobiledoc('Test static page content'),
                page: 1,
                published_at: new Date('2013/12/30').getTime(),
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
                status: 'published',
                id: 2,
                title: 'Test normal post',
                slug: 'test-normal-post',
                mobiledoc: markdownToMobiledoc('The test normal post content'),
                page: 0,
                published_at: new Date('2014/1/2').getTime(),
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
                id: 3,
                title: 'About',
                slug: 'about',
                mobiledoc: markdownToMobiledoc('This is the about page content'),
                page: 1,
                published_at: new Date('2014/1/30').getTime(),
                author: {
                    id: 1,
                    name: 'Test User',
                    slug: 'test',
                    email: 'test@ghost.org'
                },
                url: '/about/'
            }]
        }];

        beforeEach(function () {
            sandbox.stub(api.posts, 'read', function (args) {
                var post = _.find(mockPosts, function (mock) {
                    return mock.posts[0].slug === args.slug;
                });

                return Promise.resolve(post || {posts: []});
            });

            req = {
                path: '/', params: {}, route: {}
            };

            res = {
                locals: {},
                render: sinon.spy(),
                redirect: sinon.spy()
            };
        });

        describe('static pages', function () {
            describe('custom page templates', function () {
                it('it will render a custom page-slug template if it exists', function (done) {
                    req.path = '/' + mockPosts[2].posts[0].slug + '/';
                    req.route = {path: '*'};
                    res.render = function (view, context) {
                        view.should.equal('page-' + mockPosts[2].posts[0].slug);
                        context.post.should.equal(mockPosts[2].posts[0]);
                        done();
                    };
                    mockPosts[2].posts[0].url = req.path;

                    frontend.single(req, res, failTest(done));
                });

                it('it will use page.hbs if it exists and no page-slug template is present', function (done) {
                    hasTemplateStub.withArgs('page-about').returns(false);

                    req.path = '/' + mockPosts[2].posts[0].slug + '/';
                    req.route = {path: '*'};
                    res.render = function (view, context) {
                        view.should.equal('page');
                        context.post.should.equal(mockPosts[2].posts[0]);
                        done();
                    };
                    mockPosts[2].posts[0].url = req.path;

                    frontend.single(req, res, failTest(done));
                });

                it('defaults to post.hbs without a page.hbs or page-slug template', function (done) {
                    hasTemplateStub.withArgs('page-about').returns(false);
                    hasTemplateStub.withArgs('page').returns(false);

                    req.path = '/' + mockPosts[2].posts[0].slug + '/';
                    req.route = {path: '*'};
                    res.render = function (view, context) {
                        view.should.equal('post');
                        context.post.should.equal(mockPosts[2].posts[0]);
                        done();
                    };
                    mockPosts[2].posts[0].url = req.path;

                    frontend.single(req, res, failTest(done));
                });
            });

            describe('permalink set to slug', function () {
                it('will render static page via /:slug/', function (done) {
                    req.path = '/' + mockPosts[0].posts[0].slug + '/';
                    req.route = {path: '*'};
                    res.render = function (view, context) {
                        view.should.equal('page');
                        context.post.should.equal(mockPosts[0].posts[0]);
                        done();
                    };

                    frontend.single(req, res, failTest(done));
                });

                it('will NOT render static page via /YYY/MM/DD/:slug', function (done) {
                    req.path = '/' + ['2012/12/30', mockPosts[0].posts[0].slug].join('/') + '/';

                    frontend.single(req, res, function () {
                        res.render.called.should.be.false();
                        done();
                    });
                });

                it('will NOT render static page via /:author/:slug', function (done) {
                    req.path = '/' + ['test', mockPosts[0].posts[0].slug].join('/') + '/';

                    frontend.single(req, res, function () {
                        res.render.called.should.be.false();
                        done();
                    });
                });

                it('will redirect static page to admin edit page via /:slug/edit', function (done) {
                    req.path = '/' + [mockPosts[0].posts[0].slug, 'edit'].join('/') + '/';
                    res.redirect = function (arg) {
                        res.render.called.should.be.false();
                        arg.should.eql(adminEditPagePath + mockPosts[0].posts[0].id + '/');
                        done();
                    };

                    frontend.single(req, res, failTest(done));
                });

                it('will NOT redirect static page to admin edit page via /YYYY/MM/DD/:slug/edit', function (done) {
                    req.path = '/' + ['2012/12/30', mockPosts[0].posts[0].slug, 'edit'].join('/') + '/';

                    frontend.single(req, res, function () {
                        res.render.called.should.be.false();
                        res.redirect.called.should.be.false();
                        done();
                    });
                });

                it('will NOT redirect static page to admin edit page via /:author/:slug/edit', function (done) {
                    req.path = '/' + ['test', mockPosts[0].posts[0].slug, 'edit'].join('/') + '/';

                    frontend.single(req, res, function () {
                        res.render.called.should.be.false();
                        res.redirect.called.should.be.false();
                        done();
                    });
                });
            });

            describe('permalink set to date', function () {
                beforeEach(function () {
                    localSettingsCache.permalinks = '/:year/:month/:day/:slug/';
                });

                it('will render static page via /:slug', function (done) {
                    req.path = '/' + mockPosts[0].posts[0].slug + '/';
                    req.route = {path: '*'};
                    res.render = function (view, context) {
                        view.should.equal('page');
                        context.post.should.equal(mockPosts[0].posts[0]);
                        done();
                    };

                    frontend.single(req, res, failTest(done));
                });

                it('will NOT render static page via /YYYY/MM/DD/:slug', function (done) {
                    req.path = '/' + ['2012/12/30', mockPosts[0].posts[0].slug].join('/') + '/';
                    res.render = sinon.spy();

                    frontend.single(req, res, function () {
                        res.render.called.should.be.false();
                        done();
                    });
                });

                it('will redirect static page to admin edit page via /:slug/edit', function (done) {
                    req.path = '/' + [mockPosts[0].posts[0].slug, 'edit'].join('/') + '/';
                    res.render = sinon.spy();
                    res.redirect = function (arg) {
                        res.render.called.should.be.false();
                        arg.should.eql(adminEditPagePath + mockPosts[0].posts[0].id + '/');
                        done();
                    };

                    frontend.single(req, res, failTest(done));
                });

                it('will NOT redirect static page to admin edit page via /YYYY/MM/DD/:slug/edit', function (done) {
                    req.path = '/' + ['2012/12/30', mockPosts[0].posts[0].slug, 'edit'].join('/') + '/';
                    res.render = sinon.spy();
                    res.redirect = sinon.spy();

                    frontend.single(req, res, function () {
                        res.render.called.should.be.false();
                        res.redirect.called.should.be.false();
                        done();
                    });
                });
            });
        });

        describe('post', function () {
            describe('permalink set to slug', function () {
                beforeEach(function () {
                    mockPosts[1].posts[0].url = '/' + mockPosts[1].posts[0].slug + '/';
                });

                it('will render post via /:slug/', function (done) {
                    req.path = '/' + mockPosts[1].posts[0].slug + '/';
                    req.route = {path: '*'};
                    res.render = function (view, context) {
                        view.should.equal('post');
                        should.exist(context.post);
                        context.post.should.equal(mockPosts[1].posts[0]);
                        done();
                    };

                    frontend.single(req, res, failTest(done));
                });

                it('will NOT render post via /YYYY/MM/DD/:slug', function (done) {
                    req.path = '/' + ['2012/12/30', mockPosts[1].posts[0].slug].join('/') + '/';

                    frontend.single(req, res, function () {
                        res.render.called.should.be.false();
                        done();
                    });
                });

                it('will NOT render post via /:author/:slug', function (done) {
                    req.path = '/' + ['test', mockPosts[1].posts[0].slug].join('/') + '/';

                    frontend.single(req, res, function () {
                        res.render.called.should.be.false();
                        done();
                    });
                });

                // Handle Edit append
                it('will redirect post to admin edit page via /:slug/edit', function (done) {
                    req.path = '/' + [mockPosts[1].posts[0].slug, 'edit'].join('/') + '/';
                    res.redirect = function (arg) {
                        res.render.called.should.be.false();
                        arg.should.eql(adminEditPagePath + mockPosts[1].posts[0].id + '/');
                        done();
                    };

                    frontend.single(req, res, failTest(done));
                });

                it('will NOT redirect post to admin edit page via /YYYY/MM/DD/:slug/edit', function (done) {
                    req.path = '/' + ['2012/12/30', mockPosts[1].posts[0].slug, 'edit'].join('/') + '/';

                    frontend.single(req, res, function () {
                        res.render.called.should.be.false();
                        res.redirect.called.should.be.false();
                        done();
                    });
                });

                it('will NOT redirect post to admin edit page via /:author/:slug/edit', function (done) {
                    req.path = '/' + ['test', mockPosts[1].posts[0].slug, 'edit'].join('/') + '/';

                    frontend.single(req, res, function () {
                        res.render.called.should.be.false();
                        res.redirect.called.should.be.false();
                        done();
                    });
                });

                it('should call next if post is not found', function (done) {
                    req.path = '/unknown/';

                    frontend.single(req, res, function (err) {
                        if (err) {
                            return done(err);
                        }

                        should.not.exist(err);
                        res.render.called.should.be.false();
                        res.redirect.called.should.be.false();
                        done();
                    });
                });
            });

            describe('permalink set to date', function () {
                beforeEach(function () {
                    localSettingsCache.permalinks = '/:year/:month/:day/:slug/';

                    var date = moment(mockPosts[1].posts[0].published_at).format('YYYY/MM/DD');
                    mockPosts[1].posts[0].url = '/' + date + '/' + mockPosts[1].posts[0].slug + '/';
                });

                it('will render post via /YYYY/MM/DD/:slug/', function (done) {
                    var date = moment(mockPosts[1].posts[0].published_at).format('YYYY/MM/DD');
                    req.path = '/' + [date, mockPosts[1].posts[0].slug].join('/') + '/';
                    req.route = {path: '*'};

                    res.render = function (view, context) {
                        view.should.equal('post');
                        should.exist(context.post);
                        context.post.should.equal(mockPosts[1].posts[0]);
                        done();
                    };

                    frontend.single(req, res, failTest(done));
                });

                it('will NOT render post via /:slug/', function (done) {
                    req.path = '/' + mockPosts[1].posts[0].slug + '/';

                    frontend.single(req, res, function () {
                        res.render.called.should.be.false();
                        done();
                    });
                });

                it('will NOT render post via /:author/:slug/', function (done) {
                    req.path = '/' + ['test', mockPosts[1].posts[0].slug].join('/') + '/';

                    frontend.single(req, res, function () {
                        res.render.called.should.be.false();
                        done();
                    });
                });

                // Handle Edit append
                it('will redirect post to admin edit page via /YYYY/MM/DD/:slug/edit/', function (done) {
                    var dateFormat = moment(mockPosts[1].posts[0].published_at).format('YYYY/MM/DD');

                    req.path = '/' + [dateFormat, mockPosts[1].posts[0].slug, 'edit'].join('/') + '/';
                    res.redirect = function (arg) {
                        res.render.called.should.be.false();
                        arg.should.eql(adminEditPagePath + mockPosts[1].posts[0].id + '/');
                        done();
                    };

                    frontend.single(req, res, failTest(done));
                });

                it('will NOT redirect post to admin edit page via /:slug/edit/', function (done) {
                    req.path = '/' + [mockPosts[1].posts[0].slug, 'edit'].join('/') + '/';

                    frontend.single(req, res, function () {
                        res.render.called.should.be.false();
                        res.redirect.called.should.be.false();
                        done();
                    });
                });

                it('will NOT redirect post to admin edit page via /:author/:slug/edit/', function (done) {
                    req.path = '/' + ['test', mockPosts[1].posts[0].slug, 'edit'].join('/') + '/';

                    frontend.single(req, res, function () {
                        res.render.called.should.be.false();
                        res.redirect.called.should.be.false();
                        done();
                    });
                });
            });

            describe('permalink set to author', function () {
                beforeEach(function () {
                    localSettingsCache.permalinks = 'author/:slug/';

                    // set post url to permalink-defined url
                    mockPosts[1].posts[0].url = '/test/' + mockPosts[1].posts[0].slug + '/';
                });

                it('will render post via /:author/:slug/', function (done) {
                    req.path = '/' + ['test', mockPosts[1].posts[0].slug].join('/') + '/';
                    req.route = {path: '*'};
                    res.render = function (view, context) {
                        view.should.equal('post');
                        should.exist(context.post);
                        context.post.should.equal(mockPosts[1].posts[0]);
                        done();
                    };

                    frontend.single(req, res, failTest(done));
                });

                it('will NOT render post via /YYYY/MM/DD/:slug/', function (done) {
                    var date = moment(mockPosts[1].posts[0].published_at).format('YYYY/MM/DD');
                    req.path = '/' + [date, mockPosts[1].posts[0].slug].join('/') + '/';

                    frontend.single(req, res, function () {
                        res.render.called.should.be.false();
                        done();
                    });
                });

                it('will NOT render post via /:author/:slug/ when author does not match post author', function (done) {
                    req.path = '/' + ['test-2', mockPosts[1].posts[0].slug].join('/') + '/';

                    frontend.single(req, res, function () {
                        res.render.called.should.be.false();
                        done();
                    });
                });

                it('will NOT render post via /:slug/', function (done) {
                    req.path = '/' + mockPosts[1].posts[0].slug + '/';

                    frontend.single(req, res, function () {
                        res.render.called.should.be.false();
                        done();
                    });
                });

                // Handle Edit append
                it('will redirect post to admin edit page via /:author/:slug/edit/', function (done) {
                    req.path = '/' + ['test', mockPosts[1].posts[0].slug, 'edit'].join('/') + '/';

                    res.redirect = function (arg) {
                        res.render.called.should.be.false();
                        arg.should.eql(adminEditPagePath + mockPosts[1].posts[0].id + '/');
                        done();
                    };

                    frontend.single(req, res, failTest(done));
                });

                it('will NOT redirect post to admin edit page via /YYYY/MM/DD/:slug/edit/', function (done) {
                    var date = moment(mockPosts[1].posts[0].published_at).format('YYYY/MM/DD');
                    req.path = '/' + [date, mockPosts[1].posts[0].slug, 'edit'].join('/') + '/';

                    frontend.single(req, res, function () {
                        res.render.called.should.be.false();
                        res.redirect.called.should.be.false();
                        done();
                    });
                });

                it('will NOT redirect post to admin edit page /:slug/edit/', function (done) {
                    req.path = '/' + [mockPosts[1].posts[0].slug, 'edit'].join('/') + '/';

                    frontend.single(req, res, function () {
                        res.render.called.should.be.false();
                        res.redirect.called.should.be.false();
                        done();
                    });
                });
            });

            describe('permalink set to custom format', function () {
                beforeEach(function () {
                    localSettingsCache.permalinks = '/:year/:slug/';

                    var date = moment(mockPosts[1].posts[0].published_at).format('YYYY');
                    mockPosts[1].posts[0].url = '/' + date + '/' + mockPosts[1].posts[0].slug + '/';
                });

                it('will render post via /:year/:slug/', function (done) {
                    var date = moment(mockPosts[1].posts[0].published_at).format('YYYY');

                    req.path = '/' + [date, mockPosts[1].posts[0].slug].join('/') + '/';
                    req.route = {path: '*'};

                    res = {
                        locals: {},
                        render: function (view, context) {
                            view.should.equal('post');
                            should.exist(context.post);
                            context.post.should.equal(mockPosts[1].posts[0]);
                            done();
                        }
                    };

                    frontend.single(req, res, failTest(done));
                });

                it('will NOT render post via /YYYY/MM/DD/:slug/', function (done) {
                    var date = moment(mockPosts[1].posts[0].published_at).format('YYYY/MM/DD'),
                        req = {
                            path: '/' + [date, mockPosts[1].posts[0].slug].join('/') + '/'
                        },
                        res = {
                            locals: {},
                            render: sinon.spy()
                        };

                    frontend.single(req, res, function () {
                        res.render.called.should.be.false();
                        done();
                    });
                });

                it('will NOT render post via /:year/slug/ when year does not match post year', function (done) {
                    var date = moment(mockPosts[1].posts[0].published_at).subtract(1, 'years').format('YYYY'),
                        req = {
                            path: '/' + [date, mockPosts[1].posts[0].slug].join('/') + '/'
                        },
                        res = {
                            locals: {},
                            render: sinon.spy()
                        };

                    frontend.single(req, res, function () {
                        res.render.called.should.be.false();
                        done();
                    });
                });

                it('will NOT render post via /:slug/', function (done) {
                    var req = {
                            path: '/' + mockPosts[1].posts[0].slug + '/'
                        },
                        res = {
                            locals: {},
                            render: sinon.spy()
                        };

                    frontend.single(req, res, function () {
                        res.render.called.should.be.false();
                        done();
                    });
                });

                // Handle Edit append
                it('will redirect post to admin edit page via /:year/:slug/edit/', function (done) {
                    var date = moment(mockPosts[1].posts[0].published_at).format('YYYY'),
                        req = {
                            path: '/' + [date, mockPosts[1].posts[0].slug, 'edit'].join('/') + '/'
                        },
                        res = {
                            locals: {},
                            render: sinon.spy(),
                            redirect: function (arg) {
                                res.render.called.should.be.false();
                                arg.should.eql(adminEditPagePath + mockPosts[1].posts[0].id + '/');
                                done();
                            }
                        };

                    frontend.single(req, res, failTest(done));
                });

                it('will NOT redirect post to admin edit page /:slug/edit/', function (done) {
                    var req = {
                            path: '/' + [mockPosts[1].posts[0].slug, 'edit'].join('/') + '/'
                        },
                        res = {
                            locals: {},
                            render: sinon.spy(),
                            redirect: sinon.spy()
                        };

                    frontend.single(req, res, function () {
                        res.render.called.should.be.false();
                        res.redirect.called.should.be.false();
                        done();
                    });
                });
            });

            describe('permalink set to custom format no slash', function () {
                beforeEach(function () {
                    localSettingsCache.permalinks = '/:year/:slug/';

                    var date = moment(mockPosts[1].posts[0].published_at).format('YYYY');
                    mockPosts[1].posts[0].url = '/' + date + '/' + mockPosts[1].posts[0].slug + '/';
                });

                // Handle Edit append
                it('will redirect post to admin edit page via /:year/:id/edit/', function (done) {
                    var date = moment(mockPosts[1].posts[0].published_at).format('YYYY'),
                        req = {
                            path: '/' + [date, mockPosts[1].posts[0].slug, 'edit'].join('/') + '/'
                        },
                        res = {
                            locals: {},
                            render: sinon.spy(),
                            redirect: function (arg) {
                                res.render.called.should.be.false();
                                arg.should.eql(adminEditPagePath + mockPosts[1].posts[0].id + '/');
                                done();
                            }
                        };

                    frontend.single(req, res, failTest(done));
                });
            });
        });
    });

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
                redirect: sinon.spy()
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

            frontend.preview(req, res, failTest(done));
        });

        it('should render draft page', function (done) {
            req.params = {uuid: 'abc-1234-01'};
            res.render = function (view, context) {
                view.should.equal('page');
                should.exist(context.post);
                context.post.should.equal(mockPosts[0].posts[0]);
                done();
            };

            frontend.preview(req, res, failTest(done));
        });

        it('should call next if post is not found', function (done) {
            req.params = {uuid: 'abc-1234-04'};

            frontend.preview(req, res, function (err) {
                should.not.exist(err);
                res.render.called.should.be.false();
                res.redirect.called.should.be.false();
                done();
            });
        });

        it('should call redirect if post is published', function (done) {
            req.params = {uuid: 'abc-1234-03'};
            res.redirect = function (status, url) {
                res.render.called.should.be.false();
                status.should.eql(301);
                url.should.eql('/getting-started/');
                done();
            };

            frontend.preview(req, res, failTest(done));
        });
    });
});
