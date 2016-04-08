/*globals describe, it */
var should     = require('should'),
    validation = require('../../../server/data/validation'),
    config     = require('../../../server/config');

describe('Validation', function () {
    it('should validate an RSS feed url', function () {
        validation.validator.isRssFeed(config.getBaseUrl() + '/rss/').should.be.true();
        validation.validator.isRssFeed(config.getBaseUrl() + '/rss/1').should.be.true();
        validation.validator.isRssFeed(config.getBaseUrl() + '/rss/123').should.be.true();
        validation.validator.isRssFeed(config.getBaseUrl() + '/' + config.routeKeywords.author + '/foo/rss/').should.be.true();
        validation.validator.isRssFeed(config.getBaseUrl() + '/' + config.routeKeywords.author + '/foo/rss/1').should.be.true();
        validation.validator.isRssFeed(config.getBaseUrl() + '/' + config.routeKeywords.author + '/foo/rss/123').should.be.true();
        validation.validator.isRssFeed(config.getBaseUrl() + '/' + config.routeKeywords.tag + '/foo/rss/').should.be.true();
        validation.validator.isRssFeed(config.getBaseUrl() + '/' + config.routeKeywords.tag + '/foo/rss/1').should.be.true();
        validation.validator.isRssFeed(config.getBaseUrl() + '/' + config.routeKeywords.tag + '/foo/rss/123').should.be.true();
    });
});
