/*globals describe, it*/
var getModifiedDate = require('../../../server/data/meta/modified_date'),
    should = require('should');

describe('getModifiedDate', function () {
    it('should return updated at date as ISO 8601 from context if exists', function () {
        var modDate = getModifiedDate({
            context: ['post'],
            post: {
                updated_at: new Date('2016-01-01 12:56:45.232Z')
            }
        });
        should.equal(modDate, '2016-01-01T12:56:45.232Z');
    });

    it('should return null if no update_at date on context', function () {
        var modDate = getModifiedDate({
            context: ['author'],
            author: {}
        });
        should.equal(modDate, null);
    });

    it('should return null if context and property do not match in name', function () {
        var modDate = getModifiedDate({
            context: ['author'],
            post: {
                updated_at: new Date('2016-01-01 12:56:45.232Z')
            }
        });
        should.equal(modDate, null);
    });
});
