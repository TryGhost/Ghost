/*globals describe, it*/
/*jshint expr:true*/
var should = require('should'),

// Thing we're testing
    utils = require('../../server/models/base/utils');

// To stop jshint complaining
should.equal(true, true);

describe('paginateResponse', function () {
    it('returns correct pagination object for single page', function () {
        utils.paginateResponse(5, {limit: 10, page: 1}).should.eql({
            limit: 10,
            next: null,
            page: 1,
            pages: 1,
            prev: null,
            total: 5
        });
    });

    it('returns correct pagination object for first page of many', function () {
        utils.paginateResponse(44, {limit: 5, page: 1}).should.eql({
            limit: 5,
            next: 2,
            page: 1,
            pages: 9,
            prev: null,
            total: 44
        });
    });

    it('returns correct pagination object for middle page of many', function () {
        utils.paginateResponse(44, {limit: 5, page: 9}).should.eql({
            limit: 5,
            next: null,
            page: 9,
            pages: 9,
            prev: 8,
            total: 44
        });
    });

    it('returns correct pagination object for last page of many', function () {
        utils.paginateResponse(44, {limit: 5, page: 3}).should.eql({
            limit: 5,
            next: 4,
            page: 3,
            pages: 9,
            prev: 2,
            total: 44
        });
    });

    it('returns correct pagination object when page not set', function () {
        utils.paginateResponse(5, {limit: 10}).should.eql({
            limit: 10,
            next: null,
            page: 1,
            pages: 1,
            prev: null,
            total: 5
        });
    });

    it('returns correct pagination object for limit all', function () {
        utils.paginateResponse(5, {limit: 'all'}).should.eql({
            limit: 'all',
            next: null,
            page: 1,
            pages: 1,
            prev: null,
            total: 5
        });
    });
});
