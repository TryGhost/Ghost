var should = require('should'),
    _ = require('lodash'),
    testUtils = require('../../utils'),
    SlugAPI = require('../../../server/api/slugs');

describe('Slug API', function () {
    // Keep the DB clean
    before(testUtils.teardown);
    after(testUtils.teardown);

    before(testUtils.setup('settings', 'users:roles', 'perms:slug', 'perms:init'));

    should.exist(SlugAPI);

    it('can generate post slug', function (done) {
        SlugAPI.generate(_.merge({type: 'post', name: 'A fancy Title'}, testUtils.context.owner))
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
        SlugAPI.generate(_.merge({type: 'tag', name: 'A fancy Title'}, testUtils.context.owner))
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
        SlugAPI.generate(_.merge({type: 'user', name: 'user name'}, testUtils.context.owner))
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
        SlugAPI.generate(_.merge({type: 'tag', name: 'app name'}, testUtils.context.owner))
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
        SlugAPI.generate(_.merge({type: 'unknown-type', name: 'A fancy Title'}, testUtils.context.owner))
            .then(function () {
                done(new Error('Generate a slug for an unknown type is not rejected.'));
            }).catch(function (error) {
            error.errorType.should.equal('BadRequestError');
            done();
        }).catch(done);
    });

    it('rejects invalid types with ValidationError', function (done) {
        SlugAPI.generate(_.merge({type: 'unknown type', name: 'A fancy Title'}, testUtils.context.owner))
            .then(function () {
                done(new Error('Generate a slug for an unknown type is not rejected.'));
            }).catch(function (errors) {
            errors.should.have.property('errorType', 'ValidationError');
            done();
        }).catch(done);
    });
});
