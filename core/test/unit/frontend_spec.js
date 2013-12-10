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
        apiStub;

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
            apiStub = sandbox.stub(api.posts , 'read', function (args) {
                return when(args.id === 1 ? mockStaticPost : mockPost);
            });

            sandbox.stub(api.settings , 'read', function () {
                return when({
                    'key': 'activeTheme',
                    'value': 'casper'
                });
            });

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

      it('can render a static page', function(done) {
        var req = {
            params: {
                'id': 1,
                'slug': 'test-static-page'
            }
        };

        var res = {
            render: function(view, context) {
                assert.equal(view, 'page');
                assert(context.post, 'Context object has post attribute');
                assert.equal(context.post, mockStaticPost);
                done();
            }
        };

        frontend.single(req, res, null);

      });

      it('can render a normal post', function(done) {
        var req = {
            params: {
                'id': 2,
                'slug': 'test-normal-post'
            }
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

    });
});