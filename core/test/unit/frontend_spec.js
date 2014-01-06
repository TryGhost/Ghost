/*globals describe, beforeEach, afterEach, it*/
var assert   = require('assert'),
    moment   = require('moment'),
    should   = require('should'),
    sinon    = require('sinon'),
    when     = require('when'),

// Stuff we are testing
    config   = require('../../server/config'),
    api      = require('../../server/api'),
    frontend = require('../../server/controllers/frontend');

describe('Frontend Controller', function () {

    var ghost,
        sandbox,
        apiSettingsStub,
        adminEditPagePath = '/ghost/editor/';

    beforeEach(function () {
        sandbox = sinon.sandbox.create();
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
            sandbox.stub(config, 'paths', function () { return {subdir: '/blog'}; });

            var req = {params: {page: 0}, route: {path: '/page/:page/'}};

            frontend.homepage(req, res, null);

            res.redirect.called.should.be.true;
            res.redirect.calledWith('/blog/').should.be.true;
            res.render.called.should.be.false;
        });

        it('Redirects to home if page number is 1 with subdirectory', function () {
            sandbox.stub(config, 'paths', function () { return {subdir: '/blog'}; });

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
            sandbox.stub(config, 'paths', function () { return {subdir: '/blog'}; });

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
            };

        beforeEach(function () {
            sandbox.stub(api.posts, 'read', function (args) {
                return when(args.slug === mockStaticPost.slug ? mockStaticPost : mockPost);
            });

            apiSettingsStub = sandbox.stub(api.settings, 'read');

            apiSettingsStub.withArgs('activeTheme').returns(when({
                'key': 'activeTheme',
                'value': 'casper'
            }));

            sandbox.stub(config, 'paths', function () {
                return {
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
                };
            });
        });

        describe('permalink set to slug', function () {
            beforeEach(function () {
                apiSettingsStub.withArgs('permalinks').returns(when({
                    value: '/:slug/'
                }));
            });

            it('can render a static page', function (done) {
                var req = {
                        params: [undefined, mockStaticPost.slug]
                    },
                    res = {
                        render: function (view, context) {
                            assert.equal(view, 'page');
                            assert.equal(context.post, mockStaticPost);
                            done();
                        }
                    };

                frontend.single(req, res, null);
            });

            it('will NOT render a static page accessed as a date url', function (done) {
                var req = {
                        params: ['2012/12/30/', mockStaticPost.slug]
                    },
                    res = {
                        render: sinon.spy()
                    };

                frontend.single(req, res, function () {
                    res.render.called.should.be.false;
                    done();
                });
            });

            it('can render a normal post', function (done) {
                var req = {
                        params: [undefined, mockPost.slug]
                    },
                    res = {
                        render: function (view, context) {
                            assert.equal(view, 'post');
                            assert(context.post, 'Context object has post attribute');
                            assert.equal(context.post, mockPost);
                            done();
                        }
                    };

                frontend.single(req, res, null);
            });

            it('will NOT render a normal post accessed as a date url', function (done) {
                var req = {
                        params: ['2012/12/30/', mockPost.slug]
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
            it('will redirect to admin edit page for a normal post', function (done) {
                var req = {
                        params: [undefined, mockPost.slug, 'edit']
                    },
                    res = {
                        render: sinon.spy(),
                        redirect: function(arg) {
                            res.render.called.should.be.false;
                            arg.should.eql(adminEditPagePath + mockPost.id + '/');
                            done();
                        }
                    };

                frontend.single(req, res, null);
            });

            it('will NOT redirect to admin edit page for a normal post accessed as a date url', function (done) {
                var req = {
                        params: ['2012/12/30/', mockPost.slug, 'edit']
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

            it('will redirect to admin edit page for a static page accessed as a slug', function (done) {
                var req = {
                        params: [undefined, mockStaticPost.slug, 'edit']
                    },
                    res = {
                        render: sinon.spy(),
                        redirect: function(arg) {
                            res.render.called.should.be.false;
                            arg.should.eql(adminEditPagePath + mockStaticPost.id + '/');
                            done();
                        }
                    };

                frontend.single(req, res, null);
            });

            it('will NOT redirect to admin edit page for a static page accessed as a date url', function (done) {
                var req = {
                        params: ['2012/12/30/', mockStaticPost.slug, 'edit']
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

            it('can render a static page', function (done) {
                var req = {
                        params: [undefined, mockStaticPost.slug]
                    },
                    res = {
                        render: function (view, context) {
                            assert.equal(view, 'page');
                            assert.equal(context.post, mockStaticPost);
                            done();
                        }
                    };

                frontend.single(req, res, null);
            });

            it('will NOT render a static page accessed as a date url', function (done) {
                var req = {
                        params: ['2012/12/30/', 'test-static-page']
                    },
                    res = {
                        render: sinon.spy()
                    };

                frontend.single(req, res, function () {
                    res.render.called.should.be.false;
                    done();
                });
            });

            it('can render a normal post', function (done) {
                var date = moment(mockPost.published_at).format('YYYY/MM/DD/'),
                    req = {
                        params: [date, mockPost.slug]
                    },
                    res = {
                        render: function (view, context) {
                            assert.equal(view, 'post');
                            assert(context.post, 'Context object has post attribute');
                            assert.equal(context.post, mockPost);
                            done();
                        }
                    };

                frontend.single(req, res, null);
            });

            it('will NOT render a normal post with the wrong date', function (done) {
                var date = moment(mockPost.published_at).subtract('days', 1).format('YYYY/MM/DD/'),
                    req = {
                        params: [date, mockPost.slug]
                    },
                    res = {
                        render: sinon.spy()
                    };

                frontend.single(req, res, function () {
                    res.render.called.should.be.false;
                    done();
                });
            });

            it('will NOT render a normal post accessed as a slug url', function (done) {
                var req = {
                        params: [undefined, mockPost.slug]
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
            it('will redirect to admin edit page for a normal post', function (done) {
                var req = {
                        params: [moment(mockPost.published_at).format('YYYY/MM/DD/'), mockPost.slug, 'edit']
                    },
                    res = {
                        render: sinon.spy(),
                        redirect: function (arg) {
                            res.render.called.should.be.false;
                            arg.should.eql(adminEditPagePath + mockPost.id + '/');
                            done();
                        }
                    };

                frontend.single(req, res, null);
            });

            it('will NOT redirect to admin edit page for a normal post accessed as a slug url', function (done) {
                var req = {
                        params: [undefined, mockPost.slug, 'edit']
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

            it('will redirect to admin edit page for a static page accessed as a slug url', function (done) {
                var req = {
                        params: [undefined, mockStaticPost.slug, 'edit']
                    },
                    res = {
                        render: sinon.spy(),
                        redirect: function (arg) {
                            res.render.called.should.be.false;
                            arg.should.eql(adminEditPagePath + mockStaticPost.id + '/');
                            done();
                        }
                    };

                frontend.single(req, res, null);
            });

            it('will NOT redirect to admin edit page for a static page accessed as a date url', function (done) {
                var req = {
                        params: ['2012/12/30/', mockStaticPost.slug, 'edit']
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

    describe('rss redirects', function () {
        var res,
            apiUsersStub;

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
            sandbox.stub(config, 'paths', function () { return {subdir: '/blog'}; });

            var req = {params: {page: 0}, route: {path: '/rss/:page/'}};

            frontend.rss(req, res, null);

            res.redirect.called.should.be.true;
            res.redirect.calledWith('/blog/rss/').should.be.true;
            res.render.called.should.be.false;
        });

        it('Redirects to home if page number is 1 with subdirectory', function () {
            sandbox.stub(config, 'paths', function () { return {subdir: '/blog'}; });

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
            sandbox.stub(config, 'paths', function () { return {subdir: '/blog'}; });

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