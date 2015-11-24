/*globals describe, before, beforeEach, after, it*/
/*jshint expr:true*/
var should         = require('should'),
    hbs            = require('express-hbs'),
    utils          = require('./utils'),

// Stuff we are testing
    handlebars     = hbs.handlebars,
    helpers        = require('../../../server/helpers');

describe('{{body_class}} helper', function () {
    var options = {};
    before(function () {
        utils.loadHelpers();
        utils.overrideConfig({paths: {
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
        utils.restoreConfig();
    });

    it('has loaded body_class helper', function () {
        should.exist(handlebars.helpers.body_class);
    });

    it('can render class string', function (done) {
        options.data.root.context = ['home'];

        helpers.body_class.call({}, options).then(function (rendered) {
            should.exist(rendered);

            rendered.string.should.equal('home-template');

            done();
        }).catch(done);
    });

    describe('can render class string for context', function () {
        function callBodyClassWithContext(context, self) {
            options.data.root.context = context;
            return helpers.body_class.call(
                self,
                options
            );
        }

        it('Standard home page', function (done) {
            callBodyClassWithContext(['home', 'index'], {relativeUrl: '/'}).then(function (rendered) {
                rendered.string.should.equal('home-template');
                done();
            }).catch(done);
        });

        it('a post', function (done) {
            callBodyClassWithContext(['post'], {relativeUrl: '/a-post-title', post: {}}).then(function (rendered) {
                rendered.string.should.equal('post-template');
                done();
            }).catch(done);
        });

        it('paginated index', function (done) {
            callBodyClassWithContext(['index', 'paged'], {relativeUrl: '/page/4'}).then(function (rendered) {
                rendered.string.should.equal('paged archive-template');
                done();
            }).catch(done);
        });

        it('tag page', function (done) {
            callBodyClassWithContext(['tag'], {relativeUrl: '/tag/foo', tag: {slug: 'foo'}}).then(function (rendered) {
                rendered.string.should.equal('tag-template tag-foo');
                done();
            }).catch(done);
        });

        it('paginated tag page', function (done) {
            callBodyClassWithContext(['tag', 'paged'], {relativeUrl: '/tag/foo/page/2', tag: {slug: 'foo'}}).then(function (rendered) {
                rendered.string.should.equal('tag-template tag-foo paged archive-template');
                done();
            }).catch(done);
        });

        it('author page', function (done) {
            callBodyClassWithContext(['author'], {relativeUrl: '/author/bar', author: {slug: 'bar'}}).then(function (rendered) {
                rendered.string.should.equal('author-template author-bar');
                done();
            }).catch(done);
        });

        it('paginated author page', function (done) {
            callBodyClassWithContext(['author', 'paged'], {relativeUrl: '/author/bar/page/2', author: {slug: 'bar'}}).then(function (rendered) {
                rendered.string.should.equal('author-template author-bar paged archive-template');
                done();
            }).catch(done);
        });

        it('private route for password protection', function (done) {
            callBodyClassWithContext(['private'], {relativeUrl: '/private/'}).then(function (rendered) {
                rendered.string.should.equal('private-template');
                done();
            }).catch(done);
        });

        it('post with tags', function (done) {
            callBodyClassWithContext(['post'], {relativeUrl: '/my-awesome-post/', post: {tags: [{slug: 'foo'}, {slug: 'bar'}]}}).then(function (rendered) {
                rendered.string.should.equal('post-template tag-foo tag-bar');
                done();
            }).catch(done);
        });

        it('a static page', function (done) {
            callBodyClassWithContext(['page'], {relativeUrl: '/about', post: {page: true}}).then(function (rendered) {
                rendered.string.should.equal('post-template page-template page');
                done();
            }).catch(done);
        });

        it('a static page with custom template', function (done) {
            callBodyClassWithContext(['page'], {relativeUrl: '/about', post: {page: true, slug: 'about'}}).then(function (rendered) {
                rendered.string.should.equal('post-template page-template page page-about page-template-about');
                done();
            }).catch(done);
        });
    });
});
