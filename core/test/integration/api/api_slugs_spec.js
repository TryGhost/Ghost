var testUtils = require('../../utils'),
    should    = require('should'),

    permissions = require('../../../server/permissions'),
    slugAPI     = require('../../../server/api/slugs');

describe('Slug API', function () {

    before(function (done) {
        testUtils.clearData().then(function () {
            done();
        }).catch(done);
    });

    beforeEach(function (done) {
        testUtils.initData().then(function () {
            return testUtils.insertDefaultFixtures();
        }).then(function () {
            done();
        }).catch(done);
    });

    afterEach(function (done) {
        testUtils.clearData().then(function () {
            done();
        }).catch(done);
    });

    it('can generate post slug', function (done) {
        permissions.init().then(function () {
            return slugAPI.generate({ context: {user: 1}, type: 'post', title: 'A fancy Title'});
        }).then(function (results) {
            should.exist(results);
            testUtils.API.checkResponse(results, 'slugs');
            results.slugs.length.should.be.above(0);
            testUtils.API.checkResponse(results.slugs[0], 'slug');
            results.slugs[0].slug.should.equal('a-fancy-title');
            done();
        }).catch(done);
    });

    it('can generate tag slug', function (done) {
        permissions.init().then(function () {
            return slugAPI.generate({ context: {user: 1}, type: 'tag', title: 'A fancy Title'});
        }).then(function (results) {
            should.exist(results);
            testUtils.API.checkResponse(results, 'slugs');
            results.slugs.length.should.be.above(0);
            testUtils.API.checkResponse(results.slugs[0], 'slug');
            results.slugs[0].slug.should.equal('a-fancy-title');
            done();
        }).catch(done);
    });

    it('reject unknown type', function (done) {
        permissions.init().then(function () {
            return slugAPI.generate({ context: {user: 1}, type: 'unknown type', title: 'A fancy Title'});
        }).then(function () {
            done(new Error('Generate a slug for a unknown type is not rejected.'));
        }, function (error) {
            error.type.should.eql('BadRequestError');
            done();
        }).catch(done);
    });

});