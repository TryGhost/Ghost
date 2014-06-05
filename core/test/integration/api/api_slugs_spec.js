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
            return permissions.init();
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
        slugAPI.generate({ context: { user: 1 }, type: 'post', name: 'A fancy Title' })
        .then(function (results) {
            should.exist(results);
            testUtils.API.checkResponse(results, 'slugs');
            results.slugs.length.should.be.above(0);
            testUtils.API.checkResponse(results.slugs[0], 'slug');
            results.slugs[0].slug.should.equal('a-fancy-title');
            done();
        }).catch(done);
    });

    it('can generate tag slug', function (done) {
        slugAPI.generate({ context: { user: 1 }, type: 'tag', name: 'A fancy Title' })
        .then(function (results) {
            should.exist(results);
            testUtils.API.checkResponse(results, 'slugs');
            results.slugs.length.should.be.above(0);
            testUtils.API.checkResponse(results.slugs[0], 'slug');
            results.slugs[0].slug.should.equal('a-fancy-title');
            done();
        }).catch(done);
    });

    it('can generate user slug', function (done) {
        slugAPI.generate({ context: { user: 1 }, type: 'tag', name: 'user name' })
        .then(function (results) {
            should.exist(results);
            testUtils.API.checkResponse(results, 'slugs');
            results.slugs.length.should.be.above(0);
            testUtils.API.checkResponse(results.slugs[0], 'slug');
            results.slugs[0].slug.should.equal('user-name');
            done();
        }).catch(done);
    });

    it('can generate app slug', function (done) {
        slugAPI.generate({ context: { user: 1 }, type: 'tag', name: 'app name' })
        .then(function (results) {
            should.exist(results);
            testUtils.API.checkResponse(results, 'slugs');
            results.slugs.length.should.be.above(0);
            testUtils.API.checkResponse(results.slugs[0], 'slug');
            results.slugs[0].slug.should.equal('app-name');
            done();
        }).catch(done);
    });

    it('rejects unknown types', function (done) {
        slugAPI.generate({ context: { user: 1 }, type: 'unknown type', name: 'A fancy Title' })
        .then(function () {
            done(new Error('Generate a slug for an unknown type is not rejected.'));
        }).catch(function (error) {
            error.type.should.equal('BadRequestError');
            done();
        }).catch(done);
    });

});