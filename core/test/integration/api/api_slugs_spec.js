/*globals describe, before, beforeEach, afterEach, it */
/*jshint expr:true*/
var testUtils   = require('../../utils'),
    should      = require('should'),

    SlugAPI     = require('../../../server/api/slugs');

describe('Slug API', function () {
    // Keep the DB clean
    before(testUtils.teardown);
    afterEach(testUtils.teardown);

    beforeEach(testUtils.setup('users:roles', 'perms:slug', 'perms:init'));

    should.exist(SlugAPI);

    it('can generate post slug', function (done) {
        SlugAPI.generate({context: {user: 1}, type: 'post', name: 'A fancy Title'})
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
        SlugAPI.generate({context: {user: 1}, type: 'tag', name: 'A fancy Title'})
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
        SlugAPI.generate({context: {user: 1}, type: 'user', name: 'user name'})
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
        SlugAPI.generate({context: {user: 1}, type: 'tag', name: 'app name'})
        .then(function (results) {
            should.exist(results);
            testUtils.API.checkResponse(results, 'slugs');
            results.slugs.length.should.be.above(0);
            testUtils.API.checkResponse(results.slugs[0], 'slug');
            results.slugs[0].slug.should.equal('app-name');
            done();
        }).catch(done);
    });

    it('rejects unknown types with BadRequestError', function (done) {
        SlugAPI.generate({context: {user: 1}, type: 'unknown-type', name: 'A fancy Title'})
        .then(function () {
            done(new Error('Generate a slug for an unknown type is not rejected.'));
        }).catch(function (error) {
            error.errorType.should.equal('BadRequestError');
            done();
        }).catch(done);
    });

    it('rejects invalid types with ValidationError', function (done) {
        SlugAPI.generate({context: {user: 1}, type: 'unknown type', name: 'A fancy Title'})
        .then(function () {
            done(new Error('Generate a slug for an unknown type is not rejected.'));
        }).catch(function (errors) {
            errors.should.have.enumerable(0).with.property('errorType', 'ValidationError');
            done();
        }).catch(done);
    });
});
