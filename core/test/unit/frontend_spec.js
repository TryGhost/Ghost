/*globals describe, beforeEach, afterEach, it*/
/*jshint expr:true*/
var moment   = require('moment'),
    should   = require('should'),
    sinon    = require('sinon'),
    Promise  = require('bluebird'),
    rewire   = require('rewire'),
    _        = require('lodash'),

// Stuff we are testing
    api      = require('../../server/api'),

    frontend = rewire('../../server/controllers/frontend'),
    config   = require('../../server/config'),
    origConfig = _.cloneDeep(config),
    defaultConfig  = require('../../../config.example')[process.env.NODE_ENV];

// To stop jshint complaining
should.equal(true, true);

describe('Frontend Controller', function () {
    var sandbox,
        apiSettingsStub,
        adminEditPagePath = '/ghost/editor/',

        resetConfig = function () {
            config.set(_.merge({}, origConfig, defaultConfig));
        };

    beforeEach(function () {
        sandbox = sinon.sandbox.create();

        // Reset frontend controller for next test
        frontend = rewire('../../server/controllers/frontend');
    });

    afterEach(function () {
        resetConfig();
        sandbox.restore();
    });

    // Helper function to prevent unit tests
    // from failing via timeout when they
    // should just immediately fail
    function failTest(done, msg) {
        return function () {
            done(new Error(msg));
        };
    }

    describe('homepage redirects', function () {
        var res;

        beforeEach(function () {
            res = {
                redirect: sandbox.spy(),
                render: sandbox.spy()
            };

            sandbox.stub(api.posts, 'browse', function () {
                return Promise.resolve({posts: {}, meta: {pagination: {pages: 3}}});
            });

            apiSettingsStub = sandbox.stub(api.settings, 'read');
            apiSettingsStub.withArgs('postsPerPage').returns(Promise.resolve({
                settings: [{
                    key: 'postsPerPage',
                    value: 5
                }]
            }));
        });

        afterEach(function () {
            config.set({paths: origConfig.paths});
            frontend.__set__('config', {paths: origConfig.paths});
            sandbox.restore();
        });

        it('Redirects to home if page number is -1', function () {
            var req = {params: {page: -1}, route: {path: '/page/:page/'}};

            frontend.homepage(req, res, null);

            res.redirect.called.should.be.true;
            res.redirect.calledWith('/').should.be.true;
            res.render.called.should.be.false;
        });

        it('Redirects to home if page number is 0', function () {
            var req = {params: {page: 0}, route: {path: '/page/:page/'}};

            frontend.homepage(req, res, null);

            res.redirect.called.should.be.true;
            res.redirect.calledWith('/').should.be.true;
            res.render.called.should.be.false;
        });

        it('Redirects to home if page number is 1', function () {
            var req = {params: {page: 1}, route: {path: '/page/:page/'}};

            frontend.homepage(req, res, null);

            res.redirect.called.should.be.true;
            res.redirect.calledWith('/').should.be.true;
            res.render.called.should.be.false;
        });

        it('Redirects to home if page number is 0 with subdirectory', function () {
            frontend.__set__('config', {
                paths: {subdir: '/blog'}
            });

            var req = {params: {page: 0}, route: {path: '/page/:page/'}};

            frontend.homepage(req, res, null);

            res.redirect.called.should.be.true;
            res.redirect.calledWith('/blog/').should.be.true;
            res.render.called.should.be.false;
        });

        it('Redirects to home if page number is 1 with subdirectory', function () {
            frontend.__set__('config', {
                paths: {subdir: '/blog'}
            });

            var req = {params: {page: 1}, route: {path: '/page/:page/'}};

            frontend.homepage(req, res, null);

            res.redirect.called.should.be.true;
            res.redirect.calledWith('/blog/').should.be.true;
            res.render.called.should.be.false;
        });

        it('Redirects to last page if page number too big', function (done) {
            var req = {params: {page: 4}, route: {path: '/page/:page/'}};

            frontend.homepage(req, res, done).then(function () {
                res.redirect.called.should.be.true;
                res.redirect.calledWith('/page/3/').should.be.true;
                res.render.called.should.be.false;
                done();
            }).catch(done);
        });

        it('Redirects to last page if page number too big with subdirectory', function (done) {
            frontend.__set__('config', {
                paths: {subdir: '/blog'}
            });

            var req = {params: {page: 4}, route: {path: '/page/:page/'}};

            frontend.homepage(req, res, done).then(function () {
                res.redirect.calledOnce.should.be.true;
                res.redirect.calledWith('/blog/page/3/').should.be.true;
                res.render.called.should.be.false;
                done();
            }).catch(done);
        });
    });

    describe('homepage', function () {
        beforeEach(function () {
            sandbox.stub(api.posts, 'browse', function () {
                return Promise.resolve({
                    posts: [],
                    meta: {
                        pagination: {
                            page: 1,
                            pages: 3
                        }
                    }
                });
            });

            apiSettingsStub = sandbox.stub(api.settings, 'read');

            apiSettingsStub.withArgs(sinon.match.has('key', 'activeTheme')).returns(Promise.resolve({
                settings: [{
                    key: 'activeTheme',
                    value: 'casper'
                }]
            }));

            apiSettingsStub.withArgs('postsPerPage').returns(Promise.resolve({
                settings: [{
                    key: 'postsPerPage',
                    value: '10'
                }]
            }));

            frontend.__set__('config', {
                paths: {
                    subdir: '',
                    availableThemes: {
                        casper: {
                            assets: null,
                            'default.hbs': '/content/themes/casper/default.hbs',
                            'index.hbs': '/content/themes/casper/index.hbs',
                            'home.hbs': '/content/themes/casper/home.hbs',
                            'page.hbs': '/content/themes/casper/page.hbs',
                            'tag.hbs': '/content/themes/casper/tag.hbs'
                        }
                    }
                },
                routeKeywords: {
                    page: 'page',
                    tag: 'tag',
                    author: 'author'
                }
            });
        });

        it('Renders home.hbs template when it exists in the active theme', function (done) {
            var req = {
                    path: '/',
                    params: {},
                    route: {}
                },
                res = {
                    locals: {},
                    render: function (view) {
                        view.should.equal('home');
                        done();
                    }
                };

            frontend.homepage(req, res, failTest(done));
        });

        it('Renders index.hbs template on 2nd page when home.bs exists', function (done) {
            var req = {
                    path: '/page/2/',
                    params: {
                        page: 2
                    },
                    route: {}
                },
                res = {
                    locals: {},
                    render: function (view) {
                        view.should.equal('index');
                        done();
                    }
                };

            frontend.homepage(req, res, failTest(done));
        });

        it('Renders index.hbs template when home.hbs doesn\'t exist', function (done) {
            frontend.__set__('config', {
                paths: {
                    subdir: '',
                    availableThemes: {
                        casper: {
                            assets: null,
                            'default.hbs': '/content/themes/casper/default.hbs',
                            'index.hbs': '/content/themes/casper/index.hbs',
                            'page.hbs': '/content/themes/casper/page.hbs',
                            'tag.hbs': '/content/themes/casper/tag.hbs'
                        }
                    }
                },
                routeKeywords: {
                    page: 'page',
                    tag: 'tag',
                    author: 'author'
                }
            });

            var req = {
                    path: '/',
                    params: {},
                    route: {}
                },
                res = {
                    locals: {},
                    render: function (view) {
                        view.should.equal('index');
                        done();
                    }
                };

            frontend.homepage(req, res, failTest(done));
        });
    });

    describe('tag', function () {
        var mockPosts = [{
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
                    email: 'test@ghost.org'
                }
            }, {
                status: 'published',
                id: 2,
                title: 'Test normal post',
                slug: 'test-normal-post',
                markdown: 'The test normal post content',
                page: 0,
                published_at: new Date('2014/1/2').getTime(),
                author: {
                    id: 1,
                    name: 'Test User'
                }
            }],
            mockTags = [{
                name: 'video',
                slug: 'video',
                id: 1
            }, {
                name: 'audio',
                slug: 'audio',
                id: 2
            }];

        beforeEach(function () {
            sandbox.stub(api.posts, 'browse', function () {
                return Promise.resolve({
                    posts: mockPosts,
                    meta: {
                        pagination: {
                            page: 1,
                            pages: 1
                        },
                        filters: {
                            tags: [mockTags[0]]
                        }
                    }
                });
            });

            apiSettingsStub = sandbox.stub(api.settings, 'read');

            apiSettingsStub.withArgs(sinon.match.has('key', 'activeTheme')).returns(Promise.resolve({
                settings: [{
                    key: 'activeTheme',
                    value: 'casper'
                }]
            }));

            apiSettingsStub.withArgs('postsPerPage').returns(Promise.resolve({
                settings: [{
                    key: 'postsPerPage',
                    value: '10'
                }]
            }));

            frontend.__set__('config', {
                paths: {
                    subdir: '',
                    availableThemes: {
                        casper: {
                            assets: null,
                            'default.hbs': '/content/themes/casper/default.hbs',
                            'index.hbs': '/content/themes/casper/index.hbs',
                            'page.hbs': '/content/themes/casper/page.hbs',
                            'tag.hbs': '/content/themes/casper/tag.hbs'
                        }
                    }
                },
                routeKeywords: {
                    page: 'page',
                    tag: 'tag',
                    author: 'author'
                }
            });
        });

        describe('custom tag template', function () {
            beforeEach(function () {
                apiSettingsStub.withArgs('permalinks').returns(Promise.resolve({
                    settings: [{
                        key: 'permalinks',
                        value: '/tag/:slug/'
                    }]
                }));
            });

            it('it will render custom tag template if it exists', function (done) {
                var req = {
                        path: '/tag/' + mockTags[0].slug,
                        params: {},
                        route: {
                            path: '/tag/:slug'
                        }
                    },
                    res = {
                        locals: {},
                        render: function (view, context) {
                            view.should.equal('tag');
                            context.tag.should.equal(mockTags[0]);
                            done();
                        }
                    };

                frontend.tag(req, res, failTest(done));
            });
        });
    });

    describe('tag redirects', function () {
        var res;

        beforeEach(function () {
            res = {
                redirect: sandbox.spy(),
                render: sandbox.spy()
            };

            sandbox.stub(api.posts, 'browse', function () {
                return Promise.resolve({posts: {}, meta: {pagination: {pages: 3}}});
            });

            apiSettingsStub = sandbox.stub(api.settings, 'read');
            apiSettingsStub.withArgs('postsPerPage').returns(Promise.resolve({
                settings: [{
                    key: 'postsPerPage',
                    value: 5
                }]
            }));
        });

        it('Redirects to base tag page if page number is -1', function () {
            var req = {params: {page: -1, slug: 'pumpkin'}};

            frontend.tag(req, res, null);

            res.redirect.called.should.be.true;
            res.redirect.calledWith('/tag/pumpkin/').should.be.true;
            res.render.called.should.be.false;
        });

        it('Redirects to base tag page if page number is 0', function () {
            var req = {params: {page: 0, slug: 'pumpkin'}};

            frontend.tag(req, res, null);

            res.redirect.called.should.be.true;
            res.redirect.calledWith('/tag/pumpkin/').should.be.true;
            res.render.called.should.be.false;
        });

        it('Redirects to base tag page if page number is 1', function () {
            var req = {params: {page: 1, slug: 'pumpkin'}};

            frontend.tag(req, res, null);

            res.redirect.called.should.be.true;
            res.redirect.calledWith('/tag/pumpkin/').should.be.true;
            res.render.called.should.be.false;
        });

        it('Redirects to base tag page if page number is 0 with subdirectory', function () {
            frontend.__set__('config', {
                paths: {subdir: '/blog'},
                routeKeywords: {tag: 'tag'}
            });

            var req = {params: {page: 0, slug: 'pumpkin'}};

            frontend.tag(req, res, null);

            res.redirect.called.should.be.true;
            res.redirect.calledWith('/blog/tag/pumpkin/').should.be.true;
            res.render.called.should.be.false;
        });

        it('Redirects to base tag page if page number is 1 with subdirectory', function () {
            frontend.__set__('config', {
                paths: {subdir: '/blog'},
                routeKeywords: {tag: 'tag'}
            });

            var req = {params: {page: 1, slug: 'pumpkin'}};

            frontend.tag(req, res, null);

            res.redirect.called.should.be.true;
            res.redirect.calledWith('/blog/tag/pumpkin/').should.be.true;
            res.render.called.should.be.false;
        });

        it('Redirects to last page if page number too big', function (done) {
            var req = {params: {page: 4, slug: 'pumpkin'}};

            frontend.tag(req, res, done).then(function () {
                res.redirect.called.should.be.true;
                res.redirect.calledWith('/tag/pumpkin/page/3/').should.be.true;
                res.render.called.should.be.false;
                done();
            }).catch(done);
        });

        it('Redirects to last page if page number too big with subdirectory', function (done) {
            frontend.__set__('config', {
                paths: {subdir: '/blog'},
                routeKeywords: {tag: 'tag'}
            });

            var req = {params: {page: 4, slug: 'pumpkin'}};

            frontend.tag(req, res, done).then(function () {
                res.redirect.calledOnce.should.be.true;
                res.redirect.calledWith('/blog/tag/pumpkin/page/3/').should.be.true;
                res.render.called.should.be.false;
                done();
            }).catch(done);
        });
    });

    describe('single', function () {
        var mockPosts = [{
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
                return Promise.resolve(_.find(mockPosts, function (mock) {
                    return mock.posts[0].slug === args.slug;
                }));
            });

            apiSettingsStub = sandbox.stub(api.settings, 'read');

            apiSettingsStub.withArgs(sinon.match.has('key', 'activeTheme')).returns(Promise.resolve({
                settings: [{
                    key: 'activeTheme',
                    value: 'casper'
                }]
            }));

            frontend.__set__('config', {
                paths: {
                    subdir: '',
                    availableThemes: {
                        casper: {
                            assets: null,
                            'default.hbs': '/content/themes/casper/default.hbs',
                            'index.hbs': '/content/themes/casper/index.hbs',
                            'page.hbs': '/content/themes/casper/page.hbs',
                            'page-about.hbs': '/content/themes/casper/page-about.hbs',
                            'post.hbs': '/content/themes/casper/post.hbs'
                        }
                    }
                },
                routeKeywords: {
                    page: 'page',
                    tag: 'tag',
                    author: 'author'
                }
            });
        });

        describe('static pages', function () {
            describe('custom page templates', function () {
                beforeEach(function () {
                    apiSettingsStub.withArgs('permalinks').returns(Promise.resolve({
                        settings: [{
                            value: '/:slug/'
                        }]
                    }));
                });

                it('it will render custom page template if it exists', function (done) {
                    var req = {
                            path: '/' + mockPosts[2].posts[0].slug + '/',
                            route: {
                                path: '*'
                            },
                            params: {}
                        },
                        res = {
                            locals: {},
                            render: function (view, context) {
                                view.should.equal('page-' + mockPosts[2].posts[0].slug);
                                context.post.should.equal(mockPosts[2].posts[0]);
                                done();
                            }
                        };
                    mockPosts[2].posts[0].url = req.path;
                    frontend.single(req, res, failTest(done));
                });
            });

            describe('permalink set to slug', function () {
                beforeEach(function () {
                    apiSettingsStub.withArgs('permalinks').returns(Promise.resolve({
                        settings: [{
                            value: '/:slug/'
                        }]
                    }));
                });

                it('will render static page via /:slug/', function (done) {
                    var req = {
                            path: '/' + mockPosts[0].posts[0].slug + '/',
                            route: {
                                path: '*'
                            },
                            params: {}
                        },
                        res = {
                            locals: {},
                            render: function (view, context) {
                                view.should.equal('page');
                                context.post.should.equal(mockPosts[0].posts[0]);
                                done();
                            }
                        };

                    frontend.single(req, res, failTest(done));
                });

                it('will NOT render static page via /YYY/MM/DD/:slug', function (done) {
                    var req = {
                            path: '/' + ['2012/12/30', mockPosts[0].posts[0].slug].join('/') + '/'
                        },
                        res = {
                            locals: {},
                            render: sinon.spy()
                        };

                    frontend.single(req, res, function () {
                        res.render.called.should.be.false;
                        done();
                    });
                });

                it('will NOT render static page via /:author/:slug', function (done) {
                    var req = {
                            path: '/' + ['test', mockPosts[0].posts[0].slug].join('/') + '/'
                        },
                        res = {
                            locals: {},
                            render: sinon.spy()
                        };

                    frontend.single(req, res, function () {
                        res.render.called.should.be.false;
                        done();
                    });
                });

                it('will redirect static page to admin edit page via /:slug/edit', function (done) {
                    var req = {
                            path: '/' + [mockPosts[0].posts[0].slug, 'edit'].join('/') + '/'
                        },
                        res = {
                            locals: {},
                            render: sinon.spy(),
                            redirect: function (arg) {
                                res.render.called.should.be.false;
                                arg.should.eql(adminEditPagePath + mockPosts[0].posts[0].id + '/');
                                done();
                            }
                        };

                    frontend.single(req, res, failTest(done));
                });

                it('will NOT redirect static page to admin edit page via /YYYY/MM/DD/:slug/edit', function (done) {
                    var req = {
                            path: '/' + ['2012/12/30', mockPosts[0].posts[0].slug, 'edit'].join('/') + '/'
                        },
                        res = {
                            locals: {},
                            render: sinon.spy(),
                            redirect: sinon.spy()
                        };

                    frontend.single(req, res, function () {
                        res.render.called.should.be.false;
                        res.redirect.called.should.be.false;
                        done();
                    });
                });

                it('will NOT redirect static page to admin edit page via /:author/:slug/edit', function (done) {
                    var req = {
                            path: '/' + ['test', mockPosts[0].posts[0].slug, 'edit'].join('/') + '/'
                        },
                        res = {
                            locals: {},
                            render: sinon.spy(),
                            redirect: sinon.spy()
                        };

                    frontend.single(req, res, function () {
                        res.render.called.should.be.false;
                        res.redirect.called.should.be.false;
                        done();
                    });
                });
            });

            describe('permalink set to date', function () {
                beforeEach(function () {
                    apiSettingsStub.withArgs('permalinks').returns(Promise.resolve({
                        settings: [{
                            value: '/:year/:month/:day/:slug/'
                        }]
                    }));
                });

                it('will render static page via /:slug', function (done) {
                    var req = {
                            path: '/' + mockPosts[0].posts[0].slug + '/',
                            route: {
                                path: '*'
                            },
                            params: {}
                        },
                        res = {
                            locals: {},
                            render: function (view, context) {
                                view.should.equal('page');
                                context.post.should.equal(mockPosts[0].posts[0]);
                                done();
                            }
                        };

                    frontend.single(req, res, failTest(done));
                });

                it('will NOT render static page via /YYYY/MM/DD/:slug', function (done) {
                    var req = {
                            path: '/' + ['2012/12/30', mockPosts[0].posts[0].slug].join('/') + '/'
                        },
                        res = {
                            render: sinon.spy()
                        };

                    frontend.single(req, res, function () {
                        res.render.called.should.be.false;
                        done();
                    });
                });

                it('will redirect static page to admin edit page via /:slug/edit', function (done) {
                    var req = {
                            path: '/' + [mockPosts[0].posts[0].slug, 'edit'].join('/') + '/'
                        },
                        res = {
                            locals: {},
                            render: sinon.spy(),
                            redirect: function (arg) {
                                res.render.called.should.be.false;
                                arg.should.eql(adminEditPagePath + mockPosts[0].posts[0].id + '/');
                                done();
                            }
                        };

                    frontend.single(req, res, failTest(done));
                });

                it('will NOT redirect static page to admin edit page via /YYYY/MM/DD/:slug/edit', function (done) {
                    var req = {
                            path: '/' + ['2012/12/30', mockPosts[0].posts[0].slug, 'edit'].join('/') + '/'
                        },
                        res = {
                            locals: {},
                            render: sinon.spy(),
                            redirect: sinon.spy()
                        };

                    frontend.single(req, res, function () {
                        res.render.called.should.be.false;
                        res.redirect.called.should.be.false;
                        done();
                    });
                });
            });
        });

        describe('post', function () {
            describe('permalink set to slug', function () {
                beforeEach(function () {
                    apiSettingsStub.withArgs('permalinks').returns(Promise.resolve({
                        settings: [{
                            value: '/:slug/'
                        }]
                    }));

                    mockPosts[1].posts[0].url = '/' + mockPosts[1].posts[0].slug + '/';
                });

                it('will render post via /:slug/', function (done) {
                    var req = {
                            path: '/' + mockPosts[1].posts[0].slug + '/',
                            route: {
                                path: '*'
                            },
                            params: {}
                        },
                        res = {
                            locals: {},
                            render: function (view, context) {
                                view.should.equal('post');
                                context.post.should.exist;
                                context.post.should.equal(mockPosts[1].posts[0]);
                                done();
                            }
                        };

                    frontend.single(req, res, failTest(done));
                });

                it('will NOT render post via /YYYY/MM/DD/:slug', function (done) {
                    var req = {
                            path: '/' + ['2012/12/30', mockPosts[1].posts[0].slug].join('/') + '/'
                        },
                        res = {
                            locals: {},
                            render: sinon.spy()
                        };

                    frontend.single(req, res, function () {
                        res.render.called.should.be.false;
                        done();
                    });
                });

                it('will NOT render post via /:author/:slug', function (done) {
                    var req = {
                            path: '/' + ['test', mockPosts[1].posts[0].slug].join('/') + '/'
                        },
                        res = {
                            locals: {},
                            render: sinon.spy()
                        };

                    frontend.single(req, res, function () {
                        res.render.called.should.be.false;
                        done();
                    });
                });

                // Handle Edit append
                it('will redirect post to admin edit page via /:slug/edit', function (done) {
                    var req = {
                            path: '/' + [mockPosts[1].posts[0].slug, 'edit'].join('/') + '/'
                        },
                        res = {
                            locals: {},
                            render: sinon.spy(),
                            redirect: function (arg) {
                                res.render.called.should.be.false;
                                arg.should.eql(adminEditPagePath + mockPosts[1].posts[0].id + '/');
                                done();
                            }
                        };

                    frontend.single(req, res, failTest(done));
                });

                it('will NOT redirect post to admin edit page via /YYYY/MM/DD/:slug/edit', function (done) {
                    var req = {
                            path: '/' + ['2012/12/30', mockPosts[1].posts[0].slug, 'edit'].join('/') + '/'
                        },
                        res = {
                            locals: {},
                            render: sinon.spy(),
                            redirect: sinon.spy()
                        };

                    frontend.single(req, res, function () {
                        res.render.called.should.be.false;
                        res.redirect.called.should.be.false;
                        done();
                    });
                });

                it('will NOT redirect post to admin edit page via /:author/:slug/edit', function (done) {
                    var req = {
                            path: '/' + ['test', mockPosts[1].posts[0].slug, 'edit'].join('/') + '/'
                        },
                        res = {
                            locals: {},
                            render: sinon.spy(),
                            redirect: sinon.spy()
                        };

                    frontend.single(req, res, function () {
                        res.render.called.should.be.false;
                        res.redirect.called.should.be.false;
                        done();
                    });
                });
            });

            describe('permalink set to date', function () {
                beforeEach(function () {
                    apiSettingsStub.withArgs('permalinks').returns(Promise.resolve({
                        settings: [{
                            value: '/:year/:month/:day/:slug/'
                        }]
                    }));

                    var date = moment(mockPosts[1].posts[0].published_at).format('YYYY/MM/DD');
                    mockPosts[1].posts[0].url = '/' + date + '/' + mockPosts[1].posts[0].slug + '/';
                });

                it('will render post via /YYYY/MM/DD/:slug/', function (done) {
                    var date = moment(mockPosts[1].posts[0].published_at).format('YYYY/MM/DD'),
                        req = {
                            path: '/' + [date, mockPosts[1].posts[0].slug].join('/') + '/',
                            route: {
                                path: '*'
                            },
                            params: {}
                        },
                        res = {
                            locals: {},
                            render: function (view, context) {
                                view.should.equal('post');
                                context.post.should.exist;
                                context.post.should.equal(mockPosts[1].posts[0]);
                                done();
                            }
                        };

                    frontend.single(req, res, failTest(done));
                });

                it('will NOT render post via /YYYY/MM/DD/:slug/ with non-matching date in url', function (done) {
                    var date = moment(mockPosts[1].published_at).subtract(1, 'days').format('YYYY/MM/DD'),
                        req = {
                            path: '/' + [date, mockPosts[1].posts[0].slug].join('/') + '/'
                        },
                        res = {
                            locals: {},
                            render: sinon.spy()
                        };

                    frontend.single(req, res, function () {
                        res.render.called.should.be.false;
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
                        res.render.called.should.be.false;
                        done();
                    });
                });

                it('will NOT render post via /:author/:slug/', function (done) {
                    var req = {
                            path: '/' + ['test', mockPosts[1].posts[0].slug].join('/') + '/'
                        },
                        res = {
                            locals: {},
                            render: sinon.spy()
                        };

                    frontend.single(req, res, function () {
                        res.render.called.should.be.false;
                        done();
                    });
                });

                // Handle Edit append
                it('will redirect post to admin edit page via /YYYY/MM/DD/:slug/edit/', function (done) {
                    var dateFormat = moment(mockPosts[1].posts[0].published_at).format('YYYY/MM/DD'),
                        req = {
                            path: '/' + [dateFormat, mockPosts[1].posts[0].slug, 'edit'].join('/') + '/'
                        },
                        res = {
                            locals: {},
                            render: sinon.spy(),
                            redirect: function (arg) {
                                res.render.called.should.be.false;
                                arg.should.eql(adminEditPagePath + mockPosts[1].posts[0].id + '/');
                                done();
                            }
                        };

                    frontend.single(req, res, failTest(done));
                });

                it('will NOT redirect post to admin edit page via /:slug/edit/', function (done) {
                    var req = {
                            path: '/' + [mockPosts[1].posts[0].slug, 'edit'].join('/') + '/'
                        },
                        res = {
                            locals: {},
                            render: sinon.spy(),
                            redirect: sinon.spy()
                        };

                    frontend.single(req, res, function () {
                        res.render.called.should.be.false;
                        res.redirect.called.should.be.false;
                        done();
                    });
                });

                it('will NOT redirect post to admin edit page via /:author/:slug/edit/', function (done) {
                    var req = {
                            path: '/' + ['test', mockPosts[1].posts[0].slug, 'edit'].join('/') + '/'
                        },
                        res = {
                            locals: {},
                            render: sinon.spy(),
                            redirect: sinon.spy()
                        };

                    frontend.single(req, res, function () {
                        res.render.called.should.be.false;
                        res.redirect.called.should.be.false;
                        done();
                    });
                });
            });

            describe('permalink set to author', function () {
                beforeEach(function () {
                    apiSettingsStub.withArgs('permalinks').returns(Promise.resolve({
                        settings: [{
                            value: '/:author/:slug/'
                        }]
                    }));

                    // set post url to permalink-defined url
                    mockPosts[1].posts[0].url = '/test/' + mockPosts[1].posts[0].slug + '/';
                });

                it('will render post via /:author/:slug/', function (done) {
                    var req = {
                            path: '/' + ['test', mockPosts[1].posts[0].slug].join('/') + '/',
                            route: {
                                path: '*'
                            },
                            params: {}
                        },
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
                        res.render.called.should.be.false;
                        done();
                    });
                });

                it('will NOT render post via /:author/:slug/ when author does not match post author', function (done) {
                    var req = {
                            path: '/' + ['test-2', mockPosts[1].posts[0].slug].join('/') + '/'
                        },
                        res = {
                            locals: {},
                            render: sinon.spy()
                        };

                    frontend.single(req, res, function () {
                        res.render.called.should.be.false;
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
                        res.render.called.should.be.false;
                        done();
                    });
                });

                // Handle Edit append
                it('will redirect post to admin edit page via /:author/:slug/edit/', function (done) {
                    var req = {
                            path: '/' + ['test', mockPosts[1].posts[0].slug, 'edit'].join('/') + '/'
                        },
                        res = {
                            locals: {},
                            render: sinon.spy(),
                            redirect: function (arg) {
                                res.render.called.should.be.false;
                                arg.should.eql(adminEditPagePath + mockPosts[1].posts[0].id + '/');
                                done();
                            }
                        };

                    frontend.single(req, res, failTest(done));
                });

                it('will NOT redirect post to admin edit page via /YYYY/MM/DD/:slug/edit/', function (done) {
                    var date = moment(mockPosts[1].posts[0].published_at).format('YYYY/MM/DD'),
                        req = {
                            path: '/' + [date, mockPosts[1].posts[0].slug, 'edit'].join('/') + '/'
                        },
                        res = {
                            locals: {},
                            render: sinon.spy(),
                            redirect: sinon.spy()
                        };

                    frontend.single(req, res, function () {
                        res.render.called.should.be.false;
                        res.redirect.called.should.be.false;
                        done();
                    });
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
                        res.render.called.should.be.false;
                        res.redirect.called.should.be.false;
                        done();
                    });
                });
            });

            describe('permalink set to custom format', function () {
                beforeEach(function () {
                    apiSettingsStub.withArgs('permalinks').returns(Promise.resolve({
                        settings: [{
                            value: '/:year/:slug/'
                        }]
                    }));

                    var date = moment(mockPosts[1].posts[0].published_at).format('YYYY');
                    mockPosts[1].posts[0].url = '/' + date + '/' + mockPosts[1].posts[0].slug + '/';
                });

                it('will render post via /:year/:slug/', function (done) {
                    var date = moment(mockPosts[1].posts[0].published_at).format('YYYY'),
                        req = {
                            path: '/' + [date, mockPosts[1].posts[0].slug].join('/') + '/',
                            route: {
                                path: '*'
                            },
                            params: {}
                        },
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
                        res.render.called.should.be.false;
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
                        res.render.called.should.be.false;
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
                        res.render.called.should.be.false;
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
                                res.render.called.should.be.false;
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
                        res.render.called.should.be.false;
                        res.redirect.called.should.be.false;
                        done();
                    });
                });
            });
        });
    });

    describe('private', function () {
        var req, config;

        beforeEach(function () {
            req = {
                route: {path: '/private/?r=/'},
                query: {r: ''},
                params: {}
            },
            config = {
                paths: {
                    adminViews: '/core/server/views',
                    availableThemes: {
                        casper: {}
                    }
                },
                routeKeywords: {private: 'private'}
            };

            apiSettingsStub = sandbox.stub(api.settings, 'read');
            apiSettingsStub.withArgs(sinon.match.has('key', 'activeTheme')).returns(Promise.resolve({
                settings: [{
                    key: 'activeTheme',
                    value: 'casper'
                }]
            }));
        });

        it('Should render default password page when theme has no password template', function (done) {
            var res = {
                locals: {version: '', relativeUrl: '/private/'},
                render: function (view) {
                    view.should.match(/private.hbs/);
                    done();
                }
            };
            frontend.__set__('config', config);

            frontend.private(req, res, failTest(done));
        });

        it('Should render theme password page when it exists', function (done) {
            var res = {
                locals: {version: '', relativeUrl: '/private/'},
                render: function (view) {
                    view.should.equal('private');
                    done();
                }
            };
            config.paths.availableThemes.casper = {
                'private.hbs': '/content/themes/casper/private.hbs'
            };
            frontend.__set__('config', config);

            frontend.private(req, res, failTest(done));
        });

        it('Should render with error when error is passed in', function (done) {
            var res = {
                error: 'Test Error',
                locals: {version: '', relativeUrl: '/private/'},
                render: function (view, context) {
                    view.should.match(/private.hbs/);
                    context.error.should.equal('Test Error');
                    done();
                }
            };
            frontend.__set__('config', config);

            frontend.private(req, res, failTest(done));
        });
    });
});
