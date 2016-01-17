/*globals describe, it*/
var getPreviousUrl = require('../../../server/data/meta/previous_url'),
    should = require('should');

describe('getPreviousUrl', function () {
    it('should return prev url if relative url and pagination prev set', function () {
        var prevUrl = getPreviousUrl({
            relativeUrl: '/test/page/3/',
            pagination: {
                prev: '2'
            }
        });
        should.equal(prevUrl, '/test/page/2/');
    });

    it('should return prev url if with / relative url', function () {
        var prevUrl = getPreviousUrl({
            relativeUrl: '/',
            pagination: {
                prev: '2'
            }
        });
        should.equal(prevUrl, '/page/2/');
    });

    it('should return prev url with no page is prev is 1', function () {
        var prevUrl = getPreviousUrl({
            relativeUrl: '/page/2/',
            pagination: {
                prev: '1'
            }
        });
        should.equal(prevUrl, '/');
    });

    it('should return absolute prev url if relative url and pagination prev set', function () {
        var prevUrl = getPreviousUrl({
            relativeUrl: '/test/page/2/',
            pagination: {
                prev: '3'
            }
        }, true);
        should.equal(prevUrl, 'http://127.0.0.1:2369/test/page/3/');
    });

    it('should return null if no pagination prev', function () {
        var prevUrl = getPreviousUrl({
            relativeUrl: '/',
            pagination: {
                next: '2'
            }
        });
        should.equal(prevUrl, null);
    });

    it('should return null if no relative url', function () {
        var prevUrl = getPreviousUrl({
            relativeUrl: '',
            pagination: {
                prev: '2'
            }
        });
        should.equal(prevUrl, null);
    });
});
