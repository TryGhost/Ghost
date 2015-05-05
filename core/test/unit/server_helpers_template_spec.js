/*globals describe, it*/
/*jshint expr:true*/
var should    = require('should'),
    hbs = require('express-hbs'),

    // Stuff we are testing
    template = require('../../server/helpers/template');

describe('Helpers Template', function () {
    it('can execute a template', function () {
        hbs.registerPartial('test', '<h1>Hello {{name}}</h1>');

        var safeString = template.execute('test', {name: 'world'});

        should.exist(safeString);
        safeString.should.have.property('string').and.equal('<h1>Hello world</h1>');
    });

    describe('getThemeViewForPost', function () {
        var themePaths = {
                assets: null,
                'default.hbs': '/content/themes/casper/default.hbs',
                'index.hbs': '/content/themes/casper/index.hbs',
                'page.hbs': '/content/themes/casper/page.hbs',
                'page-about.hbs': '/content/themes/casper/page-about.hbs',
                'post.hbs': '/content/themes/casper/post.hbs'
            },
            posts = [{
                page: 1,
                slug: 'about'
            }, {
                page: 1,
                slug: 'contact'
            }, {
                page: 0,
                slug: 'test-post'
            }];

        it('will return correct view for a post', function () {
            var view = template.getThemeViewForPost(themePaths, posts[0]);
            view.should.exist;
            view.should.eql('page-about');

            view = template.getThemeViewForPost(themePaths, posts[1]);
            view.should.exist;
            view.should.eql('page');

            view = template.getThemeViewForPost(themePaths, posts[2]);
            view.should.exist;
            view.should.eql('post');
        });
    });

    describe('getThemeViewForChannel', function () {
        var themePathsWithTagViews = {
                assets: null,
                'default.hbs': '/content/themes/casper/default.hbs',
                'index.hbs': '/content/themes/casper/index.hbs',
                'tag.hbs': '/content/themes/casper/tag.hbs',
                'tag-design.hbs': '/content/themes/casper/tag-about.hbs'
            },
            themePaths = {
                assets: null,
                'default.hbs': '/content/themes/casper/default.hbs',
                'index.hbs': '/content/themes/casper/index.hbs'
            },
            CHANNEL = 'tag',
            CUSTOM_EXISTS = 'design',
            DEFAULT = 'development';

        it('will return correct view for a tag', function () {
            var view = template.getThemeViewForChannel(themePathsWithTagViews, CHANNEL, CUSTOM_EXISTS);
            view.should.exist;
            view.should.eql('tag-design');

            view = template.getThemeViewForChannel(themePathsWithTagViews, CHANNEL, DEFAULT);
            view.should.exist;
            view.should.eql('tag');

            view = template.getThemeViewForChannel(themePaths, CHANNEL, DEFAULT);
            view.should.exist;
            view.should.eql('index');
        });
    });
});
