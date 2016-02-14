/*globals describe, beforeEach, afterEach, it*/
var moment   = require('moment'),
    should   = require('should'),
    sinon    = require('sinon'),
    Promise  = require('bluebird'),
    _        = require('lodash'),
    path     = require('path'),

// Stuff we are testing
    api      = require('../../../../server/api'),
    frontend = require('../../../../server/controllers/frontend'),

    configUtils = require('../../../utils/configUtils'),
    sandbox = sinon.sandbox.create();

describe('Frontend Controller', function () {
    var adminEditPagePath = '/ghost/editor/';

    afterEach(function () {
        sandbox.restore();
        configUtils.restore();
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
        var req, res, casper, mockPosts = [{
                posts: [{
                    status: 'published',
                    id: 1,
                    title: 'Test static page',
                    slug: 'test-static-page',
                    markdown: 'Test static page content',
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
                    markdown: 'The test normal post content',
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
                    markdown: 'This is the about page content',
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

            configUtils.set({
                theme: {
                    permalinks: '/:slug/'
                }
            });

            casper = {
                assets: null,
                'default.hbs': '/content/themes/casper/default.hbs',
                'index.hbs': '/content/themes/casper/index.hbs',
                'page.hbs': '/content/themes/casper/page.hbs',
                'page-about.hbs': '/content/themes/casper/page-about.hbs',
                'post.hbs': '/content/themes/casper/post.hbs'
            };

            req = {
                app: {get: function () { return 'casper'; }},
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
                beforeEach(function () {
                    configUtils.set({
                        theme: {
                            permalinks: '/:slug/'
                        }
                    });
                });

                it('it will render a custom page-slug template if it exists', function (done) {
                    configUtils.set({paths: {availableThemes: {casper: casper}}});
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
                    delete casper['page-about.hbs'];
                    configUtils.set({paths: {availableThemes: {casper: casper}}});
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
                    delete casper['page-about.hbs'];
                    delete casper['page.hbs'];
                    configUtils.set({paths: {availableThemes: {casper: casper}}});
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
                beforeEach(function () {
                    configUtils.set({
                        theme: {
                            permalinks: '/:slug/'
                        }
                    });
                });

                it('will render static page via /:slug/', function (done) {
                    configUtils.set({paths: {availableThemes: {casper: casper}}});

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
                    configUtils.set({
                        theme: {
                            permalinks: '/:year/:month/:day/:slug/'
                        }
                    });
                });

                it('will render static page via /:slug', function (done) {
                    configUtils.set({paths: {availableThemes: {casper: casper}}});

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
                    configUtils.set({
                        theme: {
                            permalinks: '/:slug/'
                        }
                    });

                    mockPosts[1].posts[0].url = '/' + mockPosts[1].posts[0].slug + '/';
                });

                it('will render post via /:slug/', function (done) {
                    configUtils.set({paths: {availableThemes: {casper: casper}}});

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
                    configUtils.set({
                        theme: {
                            permalinks: '/:year/:month/:day/:slug/'
                        }
                    });

                    var date = moment(mockPosts[1].posts[0].published_at).format('YYYY/MM/DD');
                    mockPosts[1].posts[0].url = '/' + date + '/' + mockPosts[1].posts[0].slug + '/';
                });

                it('will render post via /YYYY/MM/DD/:slug/', function (done) {
                    configUtils.set({paths: {availableThemes: {casper: casper}}});
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

                it('will NOT render post via /YYYY/MM/DD/:slug/ with non-matching date in url', function (done) {
                    var date = moment(mockPosts[1].published_at).subtract(1, 'days').format('YYYY/MM/DD');
                    req.path = '/' + [date, mockPosts[1].posts[0].slug].join('/') + '/';

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
                    configUtils.set({
                        theme: {
                            permalinks: 'author/:slug/'
                        }
                    });

                    // set post url to permalink-defined url
                    mockPosts[1].posts[0].url = '/test/' + mockPosts[1].posts[0].slug + '/';
                });

                it('will render post via /:author/:slug/', function (done) {
                    configUtils.set({paths: {availableThemes: {casper: casper}}});

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
                    configUtils.set({
                        theme: {
                            permalinks: '/:year/:slug/'
                        }
                    });

                    configUtils.set({paths: {availableThemes: {casper: casper}}});

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
                    configUtils.set({
                        theme: {
                            permalinks: '/:year/:slug/'
                        }
                    });

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

    describe('private', function () {
        var res, req, defaultPath;

        beforeEach(function () {
            res = {
                locals: {version: ''},
                render: sandbox.spy()
            };

            req = {
                app: {get: function () { return 'casper'; }},
                route: {path: '/private/?r=/'},
                query: {r: ''},
                params: {}
            };

            defaultPath = path.join(configUtils.config.paths.appRoot, '/core/server/views/private.hbs');

            configUtils.set({
                theme: {
                    permalinks: '/:slug/'
                }
            });
        });

        it('Should render default password page when theme has no password template', function (done) {
            configUtils.set({paths: {availableThemes: {casper: {}}}});

            res.render = function (view) {
                view.should.eql(defaultPath);
                done();
            };

            frontend.private(req, res, failTest(done));
        });

        it('Should render theme password page when it exists', function (done) {
            configUtils.set({paths: {availableThemes: {casper: {
                'private.hbs': '/content/themes/casper/private.hbs'
            }}}});

            res.render = function (view) {
                view.should.eql('private');
                done();
            };

            frontend.private(req, res, failTest(done));
        });

        it('Should render with error when error is passed in', function (done) {
            configUtils.set({paths: {availableThemes: {casper: {}}}});
            res.error = 'Test Error';

            res.render = function (view, context) {
                view.should.eql(defaultPath);
                context.should.eql({error: 'Test Error'});
                done();
            };

            frontend.private(req, res, failTest(done));
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
                markdown: 'Test static page content',
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
                markdown: 'The test normal post content',
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
                markdown: 'This is a blog post',
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

            configUtils.set({
                theme: {
                    permalinks: '/:slug/'
                }
            });

            req = {
                app: {get: function () {return 'casper'; }},
                path: '/', params: {}, route: {}
            };

            res = {
                locals: {},
                render: sinon.spy(),
                redirect: sinon.spy()
            };

            configUtils.set({paths: {availableThemes: {casper: {}}}});
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
            configUtils.set({paths: {availableThemes: {casper: {'page.hbs': '/content/themes/casper/page.hbs'}}}});
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
