/*globals describe, beforeEach, afterEach, it*/
var assert   = require('assert'),
    moment   = require('moment'),
    should   = require('should'),
    sinon    = require('sinon'),
    when     = require('when'),
    rewire   = require("rewire"),

// Stuff we are testing
    api      = require('../../server/api'),
    frontend = rewire('../../server/controllers/frontend');

describe('Frontend Controller', function () {

    var ghost,
        sandbox,
        apiSettingsStub,
        adminEditPagePath = '/ghost/editor/';

    beforeEach(function () {
        sandbox = sinon.sandbox.create();

        // Reset frontend controller for next test
        frontend = rewire('../../server/controllers/frontend');
    });

    afterEach(function () {
        sandbox.restore();
    });


    describe('homepage redirects', function () {
        var res;

        beforeEach(function () {
            res = {
                redirect: sandbox.spy(),
                render: sandbox.spy()
            };

            sandbox.stub(api.posts, 'browse', function () {
                return when({posts: {}, pages: 3});
            });

            apiSettingsStub = sandbox.stub(api.settings, 'read');
            apiSettingsStub.withArgs('postsPerPage').returns(when({
                'key': 'postsPerPage',
                'value': 6
            }));
        });

        it('Redirects to home if page number is 0', function () {
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
            frontend.__set__('config', function() {
                return {
                    paths: {subdir: '/blog'}
                };
            });

            var req = {params: {page: 0}, route: {path: '/page/:page/'}};

            frontend.homepage(req, res, null);

            res.redirect.called.should.be.true;
            res.redirect.calledWith('/blog/').should.be.true;
            res.render.called.should.be.false;
        });

        it('Redirects to home if page number is 1 with subdirectory', function () {
            frontend.__set__('config', function() {
                return {
                    paths: {subdir: '/blog'}
                };
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
            });
        });

        it('Redirects to last page if page number too big with subdirectory', function (done) {
            frontend.__set__('config', function() {
                return {
                    paths: {subdir: '/blog'}
                };
            });

            var req = {params: {page: 4}, route: {path: '/page/:page/'}};

            frontend.homepage(req, res, done).then(function () {
                res.redirect.calledOnce.should.be.true;
                res.redirect.calledWith('/blog/page/3/').should.be.true;
                res.render.called.should.be.false;
                done();
            });

        });
    });

    describe('single', function () {
        var mockStaticPost = {
                'status': 'published',
                'id': 1,
                'title': 'Test static page',
                'slug': 'test-static-page',
                'markdown': 'Test static page content',
                'page': 1,
                'published_at': new Date('2013/12/30').getTime()
            },
            mockPost = {
                'status': 'published',
                'id': 2,
                'title': 'Test normal post',
                'slug': 'test-normal-post',
                'markdown': 'The test normal post content',
                'page': 0,
                'published_at': new Date('2014/1/2').getTime()
            },
            // Helper function to prevent unit tests
            // from failing via timeout when they
            // should just immediately fail
            failTest = function(done, msg) {
                return function() {
                    done(new Error(msg));
                };
            };

        beforeEach(function () {
            sandbox.stub(api.posts, 'read', function (args) {
                if (args.slug) {
                    return when(args.slug === mockStaticPost.slug ? mockStaticPost : mockPost);
                } else if (args.id) {
                    return when(args.id === mockStaticPost.id ? mockStaticPost : mockPost);
                } else {
                    return when({});
                }
            });

            apiSettingsStub = sandbox.stub(api.settings, 'read');

            apiSettingsStub.withArgs('activeTheme').returns(when({
                'key': 'activeTheme',
                'value': 'casper'
            }));

            frontend.__set__('config',  sandbox.stub().returns({
                'paths': {
                    'subdir': '',
                    'availableThemes': {
                        'casper': {
                            'assets': null,
                            'default': '/content/themes/casper/default.hbs',
                            'index': '/content/themes/casper/index.hbs',
                            'page': '/content/themes/casper/page.hbs',
                            'post': '/content/themes/casper/post.hbs'
                        }
                    }
                }
            }));
        });

        describe('static pages', function () {

            describe('permalink set to slug', function () {
                beforeEach(function () {
                    apiSettingsStub.withArgs('permalinks').returns(when({
                        value: '/:slug/'
                    }));
                });

                it('will render static page via /:slug', function (done) {
                    var req = {
                            path: '/' + mockStaticPost.slug
                        },
                        res = {
                            render: function (view, context) {
                                assert.equal(view, 'page');
                                assert.equal(context.post, mockStaticPost);
                                done();
                            }
                        };

                    frontend.single(req, res, failTest(done));
                });

                it('will NOT render static page via /YYY/MM/DD/:slug', function (done) {
                    var req = {
                            path: '/' + ['2012/12/30', mockStaticPost.slug].join('/')
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
                            path: '/' + [mockStaticPost.slug, 'edit'].join('/')
                        },
                        res = {
                            render: sinon.spy(),
                            redirect: function(arg) {
                                res.render.called.should.be.false;
                                arg.should.eql(adminEditPagePath + mockStaticPost.id + '/');
                                done();
                            }
                        };

                    frontend.single(req, res, failTest(done));
                });

                it('will NOT redirect static page to admin edit page via /YYYY/MM/DD/:slug/edit', function (done) {
                    var req = {
                            path: '/' + ['2012/12/30', mockStaticPost.slug, 'edit'].join('/')
                        },
                        res = {
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
                    apiSettingsStub.withArgs('permalinks').returns(when({
                        value: '/:year/:month/:day/:slug/'
                    }));
                });

                it('will render static page via /:slug', function (done) {
                    var req = {
                            path: '/' + mockStaticPost.slug
                        },
                        res = {
                            render: function (view, context) {
                                assert.equal(view, 'page');
                                assert.equal(context.post, mockStaticPost);
                                done();
                            }
                        };

                    frontend.single(req, res, failTest(done));
                });

                it('will NOT render static page via /YYYY/MM/DD/:slug', function (done) {
                    var req = {
                            path: '/' + ['2012/12/30', mockStaticPost.slug].join('/')
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
                            path: '/' + [mockStaticPost.slug, 'edit'].join('/')
                        },
                        res = {
                            render: sinon.spy(),
                            redirect: function (arg) {
                                res.render.called.should.be.false;
                                arg.should.eql(adminEditPagePath + mockStaticPost.id + '/');
                                done();
                            }
                        };

                    frontend.single(req, res, failTest(done));
                });

                it('will NOT redirect static page to admin edit page via /YYYY/MM/DD/:slug/edit', function (done) {
                    var req = {
                            path: '/' + ['2012/12/30', mockStaticPost.slug, 'edit'].join('/')
                        },
                        res = {
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
                    apiSettingsStub.withArgs('permalinks').returns(when({
                        value: '/:slug'
                    }));
                });

                it('will render post via /:slug', function (done) {
                    var req = {
                            path: '/' + mockPost.slug
                        },
                        res = {
                            render: function (view, context) {
                                assert.equal(view, 'post');
                                assert(context.post, 'Context object has post attribute');
                                assert.equal(context.post, mockPost);
                                done();
                            }
                        };

                    frontend.single(req, res, failTest(done));
                });

                it('will NOT render post via /YYYY/MM/DD/:slug', function (done) {
                    var req = {
                            path: '/' + ['2012/12/30', mockPost.slug].join('/')
                        },
                        res = {
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
                            path: '/' + [mockPost.slug, 'edit'].join('/')
                        },
                        res = {
                            render: sinon.spy(),
                            redirect: function(arg) {
                                res.render.called.should.be.false;
                                arg.should.eql(adminEditPagePath + mockPost.id + '/');
                                done();
                            }
                        };

                    frontend.single(req, res, failTest(done));
                });

                it('will NOT redirect post to admin edit page via /YYYY/MM/DD/:slug/edit', function (done) {
                    var req = {
                            path: '/' + ['2012/12/30', mockPost.slug, 'edit'].join('/')
                        },
                        res = {
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
                    apiSettingsStub.withArgs('permalinks').returns(when({
                        value: '/:year/:month/:day/:slug'
                    }));
                });

                it('will render post via /YYYY/MM/DD/:slug', function (done) {
                    var date = moment(mockPost.published_at).format('YYYY/MM/DD'),
                        req = {
                            path: '/' + [date, mockPost.slug].join('/')
                        },
                        res = {
                            render: function (view, context) {
                                assert.equal(view, 'post');
                                assert(context.post, 'Context object has post attribute');
                                assert.equal(context.post, mockPost);
                                done();
                            }
                        };

                    frontend.single(req, res, failTest(done));
                });

                it('will NOT render post via /YYYY/MM/DD/:slug with non-matching date in url', function (done) {
                    var date = moment(mockPost.published_at).subtract('days', 1).format('YYYY/MM/DD'),
                        req = {
                            path: '/' + [date, mockPost.slug].join('/')
                        },
                        res = {
                            render: sinon.spy()
                        };

                    frontend.single(req, res, function () {
                        res.render.called.should.be.false;
                        done();
                    });
                });

                it('will NOT render post via /:slug', function (done) {
                    var req = {
                            path: '/' + mockPost.slug
                        },
                        res = {
                            render: sinon.spy()
                        };

                    frontend.single(req, res, function () {
                        res.render.called.should.be.false;
                        done();
                    });
                });

                // Handle Edit append
                it('will redirect post to admin edit page via /YYYY/MM/DD/:slug/edit', function (done) {
                    var dateFormat = moment(mockPost.published_at).format('YYYY/MM/DD'),
                        req = {
                            path: '/' + [dateFormat, mockPost.slug, 'edit'].join('/')
                        },
                        res = {
                            render: sinon.spy(),
                            redirect: function (arg) {
                                res.render.called.should.be.false;
                                arg.should.eql(adminEditPagePath + mockPost.id + '/');
                                done();
                            }
                        };

                    frontend.single(req, res, failTest(done));
                });

                it('will NOT redirect post to admin edit page via /:slug/edit', function (done) {
                    var req = {
                            path: '/' + [mockPost.slug, 'edit'].join('/')
                        },
                        res = {
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
                    apiSettingsStub.withArgs('permalinks').returns(when({
                        value: '/:year/:slug'
                    }));
                });

                it('will render post via /:year/:slug', function (done) {
                    var date = moment(mockPost.published_at).format('YYYY'),
                        req = {
                            path: '/' + [date, mockPost.slug].join('/')
                        },
                        res = {
                            render: function (view, context) {
                                assert.equal(view, 'post');
                                assert(context.post, 'Context object has post attribute');
                                assert.equal(context.post, mockPost);
                                done();
                            }
                        };

                    frontend.single(req, res, failTest(done));
                });

                it('will NOT render post via /YYYY/MM/DD/:slug', function (done) {
                    var date = moment(mockPost.published_at).format('YYYY/MM/DD'),
                        req = {
                            path: '/' + [date, mockPost.slug].join('/')
                        },
                        res = {
                            render: sinon.spy()
                        };

                    frontend.single(req, res, function () {
                        res.render.called.should.be.false;
                        done();
                    });
                });

                it('will NOT render post via /:year/slug when year does not match post year', function (done) {
                    var date = moment(mockPost.published_at).subtract('years', 1).format('YYYY'),
                        req = {
                            path: '/' + [date, mockPost.slug].join('/')
                        },
                        res = {
                            render: sinon.spy()
                        };

                    frontend.single(req, res, function () {
                        res.render.called.should.be.false;
                        done();
                    });
                });

                it('will NOT render post via /:slug', function (done) {
                    var req = {
                            path: '/' + mockPost.slug
                        },
                        res = {
                            render: sinon.spy()
                        };

                    frontend.single(req, res, function () {
                        res.render.called.should.be.false;
                        done();
                    });
                });

                // Handle Edit append
                it('will redirect post to admin edit page via /:year/:slug/edit', function (done) {
                    var date = moment(mockPost.published_at).format('YYYY'),
                        req = {
                            path: '/' + [date, mockPost.slug, 'edit'].join('/')
                        },
                        res = {
                            render: sinon.spy(),
                            redirect: function (arg) {
                                res.render.called.should.be.false;
                                arg.should.eql(adminEditPagePath + mockPost.id + '/');
                                done();
                            }
                        };

                    frontend.single(req, res, failTest(done));
                });

                it('will NOT redirect post to admin edit page /:slug/edit', function (done) {
                    var req = {
                            path: '/' + [mockPost.slug, 'edit'].join('/')
                        },
                        res = {
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

    describe('rss redirects', function () {
        var res,
            apiUsersStub,
            overwriteConfig = function(newConfig) {
                var existingConfig = frontend.__get__('config');
                var newConfigModule = function() {
                    return newConfig;
                };
                newConfigModule.urlFor = existingConfig.urlFor;
                frontend.__set__('config', newConfigModule);
            };

        beforeEach(function () {
            res = {
                locals: { version: '' },
                redirect: sandbox.spy(),
                render: sandbox.spy()
            };

            sandbox.stub(api.posts, 'browse', function () {
                return when({posts: {}, pages: 3});
            });

            apiUsersStub = sandbox.stub(api.users, 'read').returns(when({}));

            apiSettingsStub = sandbox.stub(api.settings, 'read');
            apiSettingsStub.withArgs('title').returns(when({
                'key': 'title',
                'value': 'Test'
            }));
            apiSettingsStub.withArgs('description').returns(when({
                'key': 'description',
                'value': 'Some Text'
            }));
            apiSettingsStub.withArgs('permalinks').returns(when({
                'key': 'permalinks',
                'value': '/:slug/'
            }));
        });

        it('Redirects to rss if page number is 0', function () {
            var req = {params: {page: -1}, route: {path: '/rss/:page/'}};

            frontend.rss(req, res, null);

            res.redirect.called.should.be.true;
            res.redirect.calledWith('/rss/').should.be.true;
            res.render.called.should.be.false;

        });

        it('Redirects to rss if page number is 0', function () {
            var req = {params: {page: 0}, route: {path: '/rss/:page/'}};

            frontend.rss(req, res, null);

            res.redirect.called.should.be.true;
            res.redirect.calledWith('/rss/').should.be.true;
            res.render.called.should.be.false;

        });

        it('Redirects to home if page number is 1', function () {
            var req = {params: {page: 1}, route: {path: '/rss/:page/'}};

            frontend.rss(req, res, null);

            res.redirect.called.should.be.true;
            res.redirect.calledWith('/rss/').should.be.true;
            res.render.called.should.be.false;
        });

        it('Redirects to home if page number is 0 with subdirectory', function () {
            overwriteConfig({paths: {subdir: '/blog'}});

            var req = {params: {page: 0}, route: {path: '/rss/:page/'}};

            frontend.rss(req, res, null);

            res.redirect.called.should.be.true;
            res.redirect.calledWith('/blog/rss/').should.be.true;
            res.render.called.should.be.false;
        });

        it('Redirects to home if page number is 1 with subdirectory', function () {
            overwriteConfig({paths: {subdir: '/blog'}});

            var req = {params: {page: 1}, route: {path: '/rss/:page/'}};

            frontend.rss(req, res, null);

            res.redirect.called.should.be.true;
            res.redirect.calledWith('/blog/rss/').should.be.true;
            res.render.called.should.be.false;
        });

        it('Redirects to last page if page number too big', function (done) {
            var req = {params: {page: 4}, route: {path: '/rss/:page/'}};

            frontend.rss(req, res, done).then(function () {
                res.redirect.called.should.be.true;
                res.redirect.calledWith('/rss/3/').should.be.true;
                res.render.called.should.be.false;
                done();
            });
        });

        it('Redirects to last page if page number too big with subdirectory', function (done) {
            overwriteConfig({paths: {subdir: '/blog'}});

            var req = {params: {page: 4}, route: {path: '/rss/:page/'}};

            frontend.rss(req, res, done).then(function () {
                res.redirect.calledOnce.should.be.true;
                res.redirect.calledWith('/blog/rss/3/').should.be.true;
                res.render.called.should.be.false;
                done();
            });

        });
    });
});