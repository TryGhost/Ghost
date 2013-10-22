/*globals describe, before, beforeEach, afterEach, it */
var testUtils = require('./testUtils'),
    should = require('should'),
    _ = require('underscore');

describe('Post API', function () {

    var user = testUtils.DataGenerator.forModel.users[0],
        authCookie;

    before(function (done) {
        testUtils.clearData()
            .then(function () {
                done();
            }, done);
    });

    beforeEach(function (done) {
        testUtils.initData()
            .then(function () {
                return testUtils.insertDefaultFixtures();
            })
            .then(function () {
                return testUtils.API.login(user.email, user.password);
            })
            .then(function (authResponse) {
                authCookie = authResponse;

                done();
            }, done);
    });

    afterEach(function (done) {
        testUtils.clearData().then(function () {
            done();
        }, done);
    });

//    it('can retrieve a post', function (done) {
//        testUtils.API.get(testUtils.API.ApiRouteBase + 'posts/?status=all', authCookie).then(function (result) {
//            should.exist(result);
//            should.exist(result.response);
//            result.response.posts.length.should.be.above(1);
//            done();
//        }).otherwise(done);
//    });

});
