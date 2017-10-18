var should = require('should'), // jshint ignore:line
    makeAbsoluteUrls = require('../../../server/utils/make-absolute-urls'),
    configUtils = require('../../utils/configUtils');

describe('Make absolute URLs ', function () {
    var siteUrl = 'http://my-ghost-blog.com',
        itemUrl = 'my-awesome-post';

    beforeEach(function () {
        configUtils.set({url: 'http://my-ghost-blog.com'});
    });

    afterEach(function () {
        configUtils.restore();
    });

    it('[success] does not convert absolute URLs', function () {
        var html = '<a href="http://my-ghost-blog.com/content/images" title="Absolute URL">',
            result = makeAbsoluteUrls(html, siteUrl, itemUrl).html();

        result.should.match(/<a href="http:\/\/my-ghost-blog.com\/content\/images" title="Absolute URL">/);
    });
    it('[failure] does not convert protocol relative `//` URLs', function () {
        var html = '<a href="//my-ghost-blog.com/content/images" title="Absolute URL">',
            result = makeAbsoluteUrls(html, siteUrl, itemUrl).html();

        result.should.match(/<a href="\/\/my-ghost-blog.com\/content\/images" title="Absolute URL">/);
    });
    it('[failure] does not convert internal links starting with "#"', function () {
        var html = '<a href="#jumptosection" title="Table of Content">',
            result = makeAbsoluteUrls(html, siteUrl, itemUrl).html();

        result.should.match(/<a href="#jumptosection" title="Table of Content">/);
    });
    it('[success] converts a relative URL', function () {
        var html = '<a href="/about#nowhere" title="Relative URL">',
            result = makeAbsoluteUrls(html, siteUrl, itemUrl).html();

        result.should.match(/<a href="http:\/\/my-ghost-blog.com\/about#nowhere" title="Relative URL">/);
    });
    it('[success] converts a relative URL including subdirectories', function () {
        var html = '<a href="/about#nowhere" title="Relative URL">',
            result = makeAbsoluteUrls(html, 'http://my-ghost-blog.com/blog', itemUrl).html();

        result.should.match(/<a href="http:\/\/my-ghost-blog.com\/blog\/about#nowhere" title="Relative URL">/);
    });
});
