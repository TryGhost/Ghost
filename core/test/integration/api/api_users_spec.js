/*globals describe, before, beforeEach, afterEach, it */
var testUtils = require('../../utils'),
    should    = require('should'),

    // Stuff we are testing
    permissions   = require('../../../server/permissions'),
    DataGenerator = require('../../utils/fixtures/data-generator'),
    UsersAPI      = require('../../../server/api/users');

describe('Users API', function () {

    before(function (done) {
        testUtils.clearData().then(function () {
            done();
        }, done);
    });

    beforeEach(function (done) {
        testUtils.initData().then(function () {
            return testUtils.insertDefaultFixtures();
        }).then(function () {
            return testUtils.insertEditorUser();
        }).then(function () {
            return testUtils.insertAuthorUser();
        }).then(function () {
            done();
        }, done);
    });

    afterEach(function (done) {
        testUtils.clearData().then(function () {
            done();
        }, done);
    });

    it('browse', function (done) {
        permissions.init().then(function () {
            return UsersAPI.browse.call({user: 1});
        }).then(function (results) {
            should.exist(results);
            results.length.should.be.above(0);
            testUtils.API.checkResponse(results[0], 'user');
        }, function (error) {
            done(new Error(JSON.stringify(error)));
        }).then(function () {
            return UsersAPI.browse.call({user: 2});
        }).then(function (results) {
            should.exist(results);
            results.length.should.be.above(0);
            testUtils.API.checkResponse(results[0], 'user');
        }, function (error) {
            done(new Error(JSON.stringify(error)));
        }).then(function () {
            return UsersAPI.browse.call({user: 3});
        }).then(function (results) {
            should.exist(results);
            results.length.should.be.above(0);
            testUtils.API.checkResponse(results[0], 'user');
            done();
        }, function (error) {
            done(new Error(JSON.stringify(error)));
        })
    });
    it('browse denied', function (done) {
        permissions.init().then(function () {
            return UsersAPI.browse();
        }).then(function (results) {
            done(new Error("Browse user is not denied without authentication."));
        }, function () {
            done();
        });
    });
    it('read', function (done) {
        permissions.init().then(function () {
            return UsersAPI.read.call({user: 1}, {id: 1});
        }).then(function (result) {
            should.exist(result);
            result.id.should.eql(1);
            testUtils.API.checkResponse(result, 'user');
        }, function (error) {
            done(new Error(JSON.stringify(error)));
        }).then(function () {
            return UsersAPI.read.call({user: 2}, {id: 1});
        }).then(function (result) {
            should.exist(result);
            result.id.should.eql(1);
            testUtils.API.checkResponse(result, 'user');
        }, function (error) {
            done(new Error(JSON.stringify(error)));
        }).then(function () {
            return UsersAPI.read.call({user: 3}, {id: 1});
        }).then(function (result) {
            should.exist(result);
            result.id.should.eql(1);
            testUtils.API.checkResponse(result, 'user');
        }, function (error) {
            done(new Error(JSON.stringify(error)));
        }).then(function () {
            return UsersAPI.read({id: 1});
        }).then(function (result) {
            should.exist(result);
            result.id.should.eql(1);
            testUtils.API.checkResponse(result, 'user');
            done();
        }, function (error) {
            done(new Error(JSON.stringify(error)));
        });
    });
});