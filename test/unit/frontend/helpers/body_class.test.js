const should = require('should');
const themeList = require('../../../../core/server/services/themes/list');

// Stuff we are testing
const body_class = require('../../../../core/frontend/helpers/body_class');

describe('{{body_class}} helper', function () {
    let options = {};
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

        const rendered = body_class.call({}, options);
        should.exist(rendered);

        rendered.string.should.equal('home-template');
    });

    describe('can render class string for context', function () {
        function callBodyClassWithContext(context, self) {
            options.data.root.context = context;
            return body_class.call(
                self,
                options
            );
        }

        it('Standard home page', function () {
            const rendered = callBodyClassWithContext(
                ['home', 'index'],
                {relativeUrl: '/'}
            );

            rendered.string.should.equal('home-template');
        });

        it('a post', function () {
            const rendered = callBodyClassWithContext(
                ['post'],
                {relativeUrl: '/a-post-title', post: {}}
            );

            rendered.string.should.equal('post-template');
        });

        it('paginated index', function () {
            const rendered = callBodyClassWithContext(
                ['index', 'paged'],
                {relativeUrl: '/page/4'}
            );

            rendered.string.should.equal('paged');
        });

        it('tag page', function () {
            const rendered = callBodyClassWithContext(
                ['tag'],
                {relativeUrl: '/tag/foo', tag: {slug: 'foo'}}
            );

            rendered.string.should.equal('tag-template tag-foo');
        });

        it('paginated tag page', function () {
            const rendered = callBodyClassWithContext(
                ['tag', 'paged'],
                {relativeUrl: '/tag/foo/page/2', tag: {slug: 'foo'}}
            );

            rendered.string.should.equal('tag-template tag-foo paged');
        });

        it('author page', function () {
            const rendered = callBodyClassWithContext(
                ['author'],
                {relativeUrl: '/author/bar', author: {slug: 'bar'}}
            );

            rendered.string.should.equal('author-template author-bar');
        });

        it('paginated author page', function () {
            const rendered = callBodyClassWithContext(
                ['author', 'paged'],
                {relativeUrl: '/author/bar/page/2', author: {slug: 'bar'}}
            );

            rendered.string.should.equal('author-template author-bar paged');
        });

        it('private route for password protection', function () {
            const rendered = callBodyClassWithContext(
                ['private'],
                {relativeUrl: '/private/'}
            );

            rendered.string.should.equal('private-template');
        });

        it('post with tags', function () {
            const rendered = callBodyClassWithContext(
                ['post'],
                {relativeUrl: '/my-awesome-post/', post: {tags: [{slug: 'foo'}, {slug: 'bar'}]}}
            );

            rendered.string.should.equal('post-template tag-foo tag-bar');
        });

        it('a static page', function () {
            const rendered = callBodyClassWithContext(
                ['page'],
                {relativeUrl: '/about', page: {page: true, slug: 'about'}}
            );

            rendered.string.should.equal('page-template page-about');
        });

        it('a static page with custom template (is now the same as one without)', function () {
            const rendered = callBodyClassWithContext(
                ['page'],
                {
                    relativeUrl: '/about',
                    post: {slug: 'about'},
                    page: {slug: 'about'}
                }
            );

            rendered.string.should.equal('page-template page-about');
        });
    });
});
