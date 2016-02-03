/*globals describe, it*/
var getOgType = require('../../../server/data/meta/og_type'),
    should = require('should');

describe('getOgType', function () {
    it('should return og type profile if context is type author', function () {
        var ogType = getOgType({
            context: ['author']
        });
        should.equal(ogType, 'profile');
    });

    it('should return og type article if context is type post', function () {
        var ogType = getOgType({
            context: ['post']
        });
        should.equal(ogType, 'article');
    });

    it('should return og type website if context is not author or post', function () {
        var ogType = getOgType({
            context: ['tag']
        });
        should.equal(ogType, 'website');
    });
});
