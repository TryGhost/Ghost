var getRssUrl = require('../../../server/data/meta/rss_url'),
    config = require('../../../server/config'),
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
        should.equal(rssUrl, config.url + '/rss/');
    });

    it('should return absolute rss url with https if secure', function () {
        var rssUrl = getRssUrl({
            secure: true
        }, true);
        should.equal(rssUrl, 'https://' + config.server.host + ':' + config.server.port + '/rss/');
    });
});
