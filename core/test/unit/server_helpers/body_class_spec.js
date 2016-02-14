/*globals describe, before, beforeEach, after, it*/
var should         = require('should'),
    hbs            = require('express-hbs'),
    utils          = require('./utils'),
    configUtils    = require('../../utils/configUtils'),

// Stuff we are testing
    handlebars     = hbs.handlebars,
    helpers        = require('../../../server/helpers');

describe('{{body_class}} helper', function () {
    var options = {};
    before(function () {
        utils.loadHelpers();
        configUtils.set({paths: {
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
        }});
    });

    beforeEach(function () {
        options = {
            data: {
                root: {
                    context: [],
                    settings: {activeTheme: 'casper'}
                }
            }
        };
    });

    after(function () {
        configUtils.restore();
    });

    it('has loaded body_class helper', function () {
        should.exist(handlebars.helpers.body_class);
    });

    it('can render class string', function () {
        options.data.root.context = ['home'];

        var rendered = helpers.body_class.call({}, options);
        should.exist(rendered);

        rendered.string.should.equal('home-template');
    });

    describe('can render class string for context', function () {
        function callBodyClassWithContext(context, self) {
            options.data.root.context = context;
            return helpers.body_class.call(
                self,
                options
            );
        }

        it('Standard home page', function () {
            var rendered = callBodyClassWithContext(
                ['home', 'index'],
                {relativeUrl: '/'}
            );

            rendered.string.should.equal('home-template');
        });

        it('a post', function () {
            var rendered = callBodyClassWithContext(
                ['post'],
                {relativeUrl: '/a-post-title', post: {}}
            );

            rendered.string.should.equal('post-template');
        });

        it('paginated index', function () {
            var rendered = callBodyClassWithContext(
                ['index', 'paged'],
                {relativeUrl: '/page/4'}
            );

            rendered.string.should.equal('paged archive-template');
        });

        it('tag page', function () {
            var rendered = callBodyClassWithContext(
                ['tag'],
                {relativeUrl: '/tag/foo', tag: {slug: 'foo'}}
            );

            rendered.string.should.equal('tag-template tag-foo');
        });

        it('paginated tag page', function () {
            var rendered = callBodyClassWithContext(
                ['tag', 'paged'],
                {relativeUrl: '/tag/foo/page/2', tag: {slug: 'foo'}}
            );

            rendered.string.should.equal('tag-template tag-foo paged archive-template');
        });

        it('author page', function () {
            var rendered = callBodyClassWithContext(
                ['author'],
                {relativeUrl: '/author/bar', author: {slug: 'bar'}}
            );

            rendered.string.should.equal('author-template author-bar');
        });

        it('paginated author page', function () {
            var rendered = callBodyClassWithContext(
                ['author', 'paged'],
                {relativeUrl: '/author/bar/page/2', author: {slug: 'bar'}}
            );

            rendered.string.should.equal('author-template author-bar paged archive-template');
        });

        it('private route for password protection', function () {
            var rendered = callBodyClassWithContext(
                ['private'],
                {relativeUrl: '/private/'}
            );

            rendered.string.should.equal('private-template');
        });

        it('post with tags', function () {
            var rendered = callBodyClassWithContext(
                ['post'],
                {relativeUrl: '/my-awesome-post/', post: {tags: [{slug: 'foo'}, {slug: 'bar'}]}}
            );

            rendered.string.should.equal('post-template tag-foo tag-bar');
        });

        it('a static page', function () {
            var rendered = callBodyClassWithContext(
                ['page'],
                {relativeUrl: '/about', post: {page: true}}
            );

            rendered.string.should.equal('post-template page-template page');
        });

        it('a static page with custom template', function () {
            var rendered = callBodyClassWithContext(
                ['page'],
                {relativeUrl: '/about', post: {page: true, slug: 'about'}}
            );

            rendered.string.should.equal('post-template page-template page page-about page-template-about');
        });
    });
});
