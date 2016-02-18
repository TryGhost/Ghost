/*globals describe, before, after, it*/
var should         = require('should'),
    hbs            = require('express-hbs'),
    utils          = require('./utils'),
    configUtils    = require('../../utils/configUtils'),

// Stuff we are testing
    handlebars     = hbs.handlebars,
    helpers        = require('../../../server/helpers');

describe('{{page_url}} helper', function () {
    before(function () {
        utils.loadHelpers();
    });

    it('has loaded page_url helper', function () {
        should.exist(handlebars.helpers.page_url);
    });

    it('can return a valid url', function () {
        helpers.page_url(1).should.equal('/');
        helpers.page_url(2).should.equal('/page/2/');
        helpers.page_url(50).should.equal('/page/50/');
    });

    it('can return a valid url for tag pages', function () {
        var tagContext = {
            tagSlug: 'pumpkin'
        };
        helpers.page_url.call(tagContext, 1).should.equal('/tag/pumpkin/');
        helpers.page_url.call(tagContext, 2).should.equal('/tag/pumpkin/page/2/');
        helpers.page_url.call(tagContext, 50).should.equal('/tag/pumpkin/page/50/');
    });

    it('can return a valid url for author pages', function () {
        var authorContext = {
            authorSlug: 'pumpkin'
        };
        helpers.page_url.call(authorContext, 1).should.equal('/author/pumpkin/');
        helpers.page_url.call(authorContext, 2).should.equal('/author/pumpkin/page/2/');
        helpers.page_url.call(authorContext, 50).should.equal('/author/pumpkin/page/50/');
    });

    describe('with /blog subdirectory', function () {
        before(function () {
            configUtils.set({url: 'http://testurl.com/blog'});
        });

        after(function () {
            configUtils.restore();
        });

        it('can return a valid url with subdirectory', function () {
            helpers.page_url(1).should.equal('/blog/');
            helpers.page_url(2).should.equal('/blog/page/2/');
            helpers.page_url(50).should.equal('/blog/page/50/');
        });

        it('can return a valid url for tag pages with subdirectory', function () {
            var authorContext = {
                authorSlug: 'pumpkin'
            };
            helpers.page_url.call(authorContext, 1).should.equal('/blog/author/pumpkin/');
            helpers.page_url.call(authorContext, 2).should.equal('/blog/author/pumpkin/page/2/');
            helpers.page_url.call(authorContext, 50).should.equal('/blog/author/pumpkin/page/50/');
        });

        it('can return a valid url for tag pages with subdirectory', function () {
            var tagContext = {
                tagSlug: 'pumpkin'
            };
            helpers.page_url.call(tagContext, 1).should.equal('/blog/tag/pumpkin/');
            helpers.page_url.call(tagContext, 2).should.equal('/blog/tag/pumpkin/page/2/');
            helpers.page_url.call(tagContext, 50).should.equal('/blog/tag/pumpkin/page/50/');
        });
    });
});

describe('{{pageUrl}} helper [DEPRECATED]', function () {
    before(function () {
        utils.loadHelpers();
    });

    it('has loaded pageUrl helper', function () {
        should.exist(handlebars.helpers.pageUrl);
    });

    it('can return a valid url', function () {
        helpers.pageUrl(1).should.equal('/');
        helpers.pageUrl(2).should.equal('/page/2/');
        helpers.pageUrl(50).should.equal('/page/50/');
    });

    it('can return a valid url for author pages', function () {
        var authorContext = {
            authorSlug: 'pumpkin'
        };
        helpers.pageUrl.call(authorContext, 1).should.equal('/author/pumpkin/');
        helpers.pageUrl.call(authorContext, 2).should.equal('/author/pumpkin/page/2/');
        helpers.pageUrl.call(authorContext, 50).should.equal('/author/pumpkin/page/50/');
    });

    it('can return a valid url for tag pages', function () {
        var tagContext = {
            tagSlug: 'pumpkin'
        };
        helpers.pageUrl.call(tagContext, 1).should.equal('/tag/pumpkin/');
        helpers.pageUrl.call(tagContext, 2).should.equal('/tag/pumpkin/page/2/');
        helpers.pageUrl.call(tagContext, 50).should.equal('/tag/pumpkin/page/50/');
    });

    describe('with /blog subdirectory', function () {
        before(function () {
            configUtils.set({url: 'http://testurl.com/blog'});
        });

        after(function () {
            configUtils.restore();
        });

        it('can return a valid url with subdirectory', function () {
            helpers.pageUrl(1).should.equal('/blog/');
            helpers.pageUrl(2).should.equal('/blog/page/2/');
            helpers.pageUrl(50).should.equal('/blog/page/50/');
        });

        it('can return a valid url for tag pages with subdirectory', function () {
            var tagContext = {
                tagSlug: 'pumpkin'
            };
            helpers.pageUrl.call(tagContext, 1).should.equal('/blog/tag/pumpkin/');
            helpers.pageUrl.call(tagContext, 2).should.equal('/blog/tag/pumpkin/page/2/');
            helpers.pageUrl.call(tagContext, 50).should.equal('/blog/tag/pumpkin/page/50/');
        });

        it('can return a valid url for tag pages with subdirectory', function () {
            var tagContext = {
                tagSlug: 'pumpkin'
            };
            helpers.pageUrl.call(tagContext, 1).should.equal('/blog/tag/pumpkin/');
            helpers.pageUrl.call(tagContext, 2).should.equal('/blog/tag/pumpkin/page/2/');
            helpers.pageUrl.call(tagContext, 50).should.equal('/blog/tag/pumpkin/page/50/');
        });
    });
});
