/*globals describe, it*/
var getRssUrl = require('../../../server/data/meta/rss_url'),
    should = require('should');

describe('getRssUrl', function () {
    it('should return rss url', function () {
        var rssUrl = getRssUrl({
            secure: false
        });
        should.equal(rssUrl, '/rss/');
    });

    it('should return absolute rss url', function () {
        var rssUrl = getRssUrl({
            secure: false
        }, true);
        should.equal(rssUrl, 'http://127.0.0.1:2369/rss/');
    });

    it('should return absolute rss url with https if secure', function () {
        var rssUrl = getRssUrl({
            secure: true
        }, true);
        should.equal(rssUrl, 'https://127.0.0.1:2369/rss/');
    });
});
