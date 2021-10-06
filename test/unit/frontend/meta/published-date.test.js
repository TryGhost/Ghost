const should = require('should');
const getPublishedDate = require('../../../../core/frontend/meta/published-date');

describe('getPublishedDate', function () {
    it('should return published at date as ISO 8601 from context if exists', function () {
        const pubDate = getPublishedDate({
            context: ['post'],
            post: {
                published_at: new Date('2016-01-01 12:56:45.232Z')
            }
        });
        should.equal(pubDate, '2016-01-01T12:56:45.232Z');
    });

    it('should return published at over created at date as ISO 8601 if has both', function () {
        const pubDate = getPublishedDate({
            context: ['post'],
            post: {
                published_at: new Date('2016-01-01 12:56:45.232Z'),
                created_at: new Date('2015-01-01 12:56:45.232Z')
            }
        });
        should.equal(pubDate, '2016-01-01T12:56:45.232Z');
    });

    it('should return published at date for an amp context', function () {
        const pubDate = getPublishedDate({
            context: ['amp', 'post'],
            post: {
                published_at: new Date('2016-01-01 12:56:45.232Z')
            }
        });
        should.equal(pubDate, '2016-01-01T12:56:45.232Z');
    });

    it('should return null if no update_at date on context', function () {
        const pubDate = getPublishedDate({
            context: ['author'],
            author: {}
        });
        should.equal(pubDate, null);
    });

    it('should return null if context and property do not match in name', function () {
        const pubDate = getPublishedDate({
            context: ['author'],
            post: {
                published_at: new Date('2016-01-01 12:56:45.232Z')
            }
        });
        should.equal(pubDate, null);
    });
});
