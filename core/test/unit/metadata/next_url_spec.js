/*globals describe, it*/
var getNextUrl = require('../../../server/data/meta/next_url'),
    should = require('should');

describe('getNextUrl', function () {
    it('should return next url if relative url and pagination next set', function () {
        var nextUrl = getNextUrl({
            relativeUrl: '/test/page/2/',
            pagination: {
                next: '3'
            }
        });
        should.equal(nextUrl, '/test/page/3/');
    });

    it('should return next url if with / relative url', function () {
        var nextUrl = getNextUrl({
            relativeUrl: '/',
            pagination: {
                next: '2'
            }
        });
        should.equal(nextUrl, '/page/2/');
    });

    it('should return absolute next url if relative url and pagination next set', function () {
        var nextUrl = getNextUrl({
            relativeUrl: '/test/page/2/',
            pagination: {
                next: '3'
            }
        }, true);
        should.equal(nextUrl, 'http://127.0.0.1:2369/test/page/3/');
    });

    it('should return null if no pagination next', function () {
        var nextUrl = getNextUrl({
            relativeUrl: '/',
            pagination: {
                prev: '2'
            }
        });
        should.equal(nextUrl, null);
    });

    it('should return null if no relative url', function () {
        var nextUrl = getNextUrl({
            relativeUrl: '',
            pagination: {
                next: '2'
            }
        });
        should.equal(nextUrl, null);
    });
});
