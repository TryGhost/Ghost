var should = require('should'),
    getOgType = require('../../../../server/data/meta/og_type');

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

    it('should return og type article if context is type amp', function () {
        var ogType = getOgType({
            context: ['amp', 'post']
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
