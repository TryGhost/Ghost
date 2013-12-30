/*globals describe, beforeEach, afterEach, it*/
var assert  = require('assert'),
    should  = require('should'),
    sinon   = require('sinon'),
    when    = require('when'),

    // Stuff we are testing
    config  = require('../../server/config'),
    api      = require('../../server/api'),
    frontend = require('../../server/controllers/frontend');

describe('Frontend Controller', function () {

    var ghost,
        sandbox,
        apiSettingsStub;

    beforeEach(function () {
        sandbox = sinon.sandbox.create();
    });

    afterEach(function () {
        sandbox.restore();
    });


    describe('homepage', function () {
        // No tests yet, shows up in coverage report
    });

    describe('single', function() {
        var mockStaticPost = {
            'status': 'published',
            'id': 1,
            'title': 'Test static page',
            'slug': 'test-static-page',
            'markdown': 'Test static page content',
            'page': 1
        };

        var mockPost = {
            'status': 'published',
            'id': 2,
            'title': 'Test normal post',
            'slug': 'test-normal-post',
            'markdown': 'The test normal post content',
            'page': 0
        };

        beforeEach(function () {
            sandbox.stub(api.posts , 'read', function (args) {
                return when(args.slug === mockStaticPost.slug ? mockStaticPost : mockPost);
            });

            apiSettingsStub = sandbox.stub(api.settings , 'read');

            apiSettingsStub.withArgs('activeTheme').returns(when({
                'key': 'activeTheme',
                'value': 'casper'
            }));

            sandbox.stub(config , 'paths', function () {
                return {
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

        describe('permalink set to slug', function() {
            beforeEach(function() {
                apiSettingsStub.withArgs('permalinks').returns(when({
                    value: '/:slug/'
                }));
            });

            it('can render a static page', function(done) {
                var req = {
                    params: ['', 'test-static-page']
                };

                var res = {
                    render: function(view, context) {
                        assert.equal(view, 'page');
                        assert.equal(context.post, mockStaticPost);
                        done();
                    }
                };

                frontend.single(req, res, null);
            });

            it('won\'t render a static page accessed as a date url', function(done) {
                var req = {
                    params: ['2012/12/30', 'test-static-page']
                };

                var res = {
                    render: sinon.spy()
                };

                frontend.single(req, res, function() {
                    res.render.called.should.be.false;
                    done();
                });
            });

            it('can render a normal post', function(done) {
                var req = {
                    params: ['', 'test-normal-post']
                };

                var res = {
                    render: function(view, context) {
                        assert.equal(view, 'post');
                        assert(context.post, 'Context object has post attribute');
                        assert.equal(context.post, mockPost);
                        done();
                    }
                };

                frontend.single(req, res, null);
            });

            it('won\'t render a normal post accessed as a date url', function(done) {
                var req = {
                    params: ['2012/12/30', 'test-normal-post']
                };

                var res = {
                    render: sinon.spy()
                };

                frontend.single(req, res, function() {
                    res.render.called.should.be.false;
                    done();
                });
            });
        });

        describe('permalink set to date', function() {
            beforeEach(function() {
                apiSettingsStub.withArgs('permalinks').returns(when({
                    value: '/:year/:month/:day/:slug/'
                }));
            });

            it('can render a static page', function(done) {
                var req = {
                    params: ['', 'test-static-page']
                };

                var res = {
                    render: function(view, context) {
                        assert.equal(view, 'page');
                        assert.equal(context.post, mockStaticPost);
                        done();
                    }
                };

                frontend.single(req, res, null);
            });

            it('won\'t render a static page accessed as a date url', function(done) {
                var req = {
                    params: ['2012/12/30', 'test-static-page']
                };

                var res = {
                    render: sinon.spy()
                };

                frontend.single(req, res, function() {
                    res.render.called.should.be.false;
                    done();
                });
            });

            it('can render a normal post', function(done) {
                var req = {
                    params: ['2012/12/30', 'test-normal-post']
                };

                var res = {
                    render: function(view, context) {
                        assert.equal(view, 'post');
                        assert(context.post, 'Context object has post attribute');
                        assert.equal(context.post, mockPost);
                        done();
                    }
                };

                frontend.single(req, res, null);
            });

            it('won\'t render a normal post accessed as a slug url', function(done) {
                var req = {
                    params: ['', 'test-normal-post']
                };

                var res = {
                    render: sinon.spy()
                };

                frontend.single(req, res, function() {
                    res.render.called.should.be.false;
                    done();
                });
            });
        });


    });
});