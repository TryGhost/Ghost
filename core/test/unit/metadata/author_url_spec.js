/*globals describe, it*/
var getAuthorUrl = require('../../../server/data/meta/author_url'),
    should = require('should');

describe('getAuthorUrl', function () {
    it('should return author url if context contains author',
    function () {
        var authorUrl = getAuthorUrl({
            context: ['post'],
            post: {
                author: {
                    slug: 'test-author'
                }
            }
        });
        authorUrl.should.equal('/author/test-author/');
    });

    it('should return absolute author url if context contains author',
    function () {
        var authorUrl = getAuthorUrl({
            context: ['post'],
            post: {
                author: {
                    slug: 'test-author'
                }
            }
        }, true);
        authorUrl.should.not.equal('/author/test-author/');
        authorUrl.should.match(/\/author\/test-author\/$/);
    });

    it('should return author url if data contains author',
    function () {
        var authorUrl = getAuthorUrl({
            author: {
                slug: 'test-author'
            }
        });
        authorUrl.should.equal('/author/test-author/');
    });

    it('should return absolute author url if data contains author',
    function () {
        var authorUrl = getAuthorUrl({
            author: {
                slug: 'test-author'
            }
        }, true);
        authorUrl.should.not.equal('/author/test-author/');
        authorUrl.should.match(/\/author\/test-author\/$/);
    });

    it('should return null if no author on data or context',
    function () {
        var authorUrl = getAuthorUrl({}, true);
        should(authorUrl).equal(null);
    });
});
