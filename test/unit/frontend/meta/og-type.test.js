const should = require('should');
const getOgType = require('../../../../core/frontend/meta/og-type');

describe('getOgType', function () {
    it('should return og type profile if context is type author', function () {
        const ogType = getOgType({
            context: ['author']
        });
        should.equal(ogType, 'profile');
    });

    it('should return og type article if context is type post', function () {
        const ogType = getOgType({
            context: ['post']
        });
        should.equal(ogType, 'article');
    });

    it('should return og type article if context is type amp', function () {
        const ogType = getOgType({
            context: ['amp', 'post']
        });
        should.equal(ogType, 'article');
    });

    it('should return og type website if context is not author or post', function () {
        const ogType = getOgType({
            context: ['tag']
        });
        should.equal(ogType, 'website');
    });
});
