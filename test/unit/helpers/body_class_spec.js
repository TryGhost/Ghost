var should = require('should'),
    themeList = require('../../../core/frontend/services/themes/list'),

    // Stuff we are testing
    helpers = require('../../../core/frontend/helpers');

describe('{{body_class}} helper', function () {
    var options = {};
    before(function () {
        themeList.init({
            casper: {
                assets: null,
                'default.hbs': '/content/themes/casper/default.hbs',
                'index.hbs': '/content/themes/casper/index.hbs',
                'page.hbs': '/content/themes/casper/page.hbs',
                'page-about.hbs': '/content/themes/casper/page-about.hbs',
                'post.hbs': '/content/themes/casper/post.hbs'
            }
        });
    });

    beforeEach(function () {
        options = {
            data: {
                root: {
                    context: [],
                    settings: {active_theme: 'casper'}
                }
            }
        };
    });

    after(function () {
        themeList.init();
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

            rendered.string.should.equal('paged');
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

            rendered.string.should.equal('tag-template tag-foo paged');
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

            rendered.string.should.equal('author-template author-bar paged');
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

        it('v2: a static page', function () {
            var rendered = callBodyClassWithContext(
                ['page'],
                {relativeUrl: '/about', page: {page: true, slug: 'about'}}
            );

            rendered.string.should.equal('page-template page-about');
        });

        it('canary: a static page', function () {
            var rendered = callBodyClassWithContext(
                ['page'],
                {relativeUrl: '/about', page: {page: true, slug: 'about'}}
            );

            rendered.string.should.equal('page-template page-about');
        });

        it('v3: a static page', function () {
            var rendered = callBodyClassWithContext(
                ['page'],
                {relativeUrl: '/about', page: {page: true, slug: 'about'}}
            );

            rendered.string.should.equal('page-template page-about');
        });

        it('a static page with custom template (is now the same as one without)', function () {
            var rendered = callBodyClassWithContext(
                ['page'],
                {relativeUrl: '/about', post: {page: true, slug: 'about'}}
            );

            rendered.string.should.equal('page-template page-about');
        });
    });
});
