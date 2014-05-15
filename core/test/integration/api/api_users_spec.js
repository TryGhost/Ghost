/*globals describe, before, beforeEach, afterEach, it */
var testUtils = require('../../utils'),
    should    = require('should'),

    permissions   = require('../../../server/permissions'),

    // Stuff we are testing
    UsersAPI      = require('../../../server/api/users');

describe('Users API', function () {

    before(function (done) {
        testUtils.clearData().then(function () {
            done();
        }).catch(done);
    });

    afterEach(function (done) {
        testUtils.clearData().then(function () {
            done();
        }).catch(done);
    });

    describe('No User', function () {
        beforeEach(function (done) {
            testUtils.initData().then(function () {
                return permissions.init();
            }).then(function () {
                done();
            }).catch(done);
        });

        it('can add with internal user', function (done) {
            UsersAPI.register({ users: [{
                'name': 'Hello World',
                'email': 'hello@world.com',
                'password': 'password'
            }]}).then(function (results) {
                should.exist(results);
                testUtils.API.checkResponse(results, 'users');
                should.exist(results.users);
                results.users.should.have.length(1);
                testUtils.API.checkResponse(results.users[0], 'user');
                results.users[0].name.should.equal('Hello World');
                done();
            }).catch(done);
        });
    });

    describe('With Users', function () {
        beforeEach(function (done) {
            testUtils.initData().then(function () {
                return testUtils.insertDefaultFixtures();
            }).then(function () {
                return testUtils.insertEditorUser();
            }).then(function () {
                return testUtils.insertAuthorUser();
            }).then(function () {
                return permissions.init();
            }).then(function () {
                done();
            }).catch(done);
        });

        it('admin can browse', function (done) {
            UsersAPI.browse({context: {user: 1}}).then(function (results) {
                should.exist(results);
                testUtils.API.checkResponse(results, 'users');
                should.exist(results.users);
                results.users.should.have.length(3);
                testUtils.API.checkResponse(results.users[0], 'user');
                testUtils.API.checkResponse(results.users[1], 'user');
                testUtils.API.checkResponse(results.users[2], 'user');
                done();
            }).catch(done);
        });

        it('editor can browse', function (done) {
            UsersAPI.browse({context: {user: 2}}).then(function (results) {
                should.exist(results);
                testUtils.API.checkResponse(results, 'users');
                should.exist(results.users);
                results.users.should.have.length(3);
                testUtils.API.checkResponse(results.users[0], 'user');
                testUtils.API.checkResponse(results.users[1], 'user');
                testUtils.API.checkResponse(results.users[2], 'user');
                done();
            }).catch(done);
        });

        it('author can browse', function (done) {
            UsersAPI.browse({context: {user: 3}}).then(function (results) {
                should.exist(results);
                testUtils.API.checkResponse(results, 'users');
                should.exist(results.users);
                results.users.should.have.length(3);
                testUtils.API.checkResponse(results.users[0], 'user');
                testUtils.API.checkResponse(results.users[1], 'user');
                testUtils.API.checkResponse(results.users[2], 'user');
                done();
            }).catch(done);
        });

        it('no-auth user cannot browse', function (done) {
            UsersAPI.browse().then(function () {
                done(new Error('Browse user is not denied without authentication.'));
            }, function () {
                done();
            }).catch(done);
        });

        it('admin can read', function (done) {
            UsersAPI.read({id: 1, context: {user: 1}}).then(function (results) {
                should.exist(results);
                testUtils.API.checkResponse(results, 'users');
                results.users[0].id.should.eql(1);
                testUtils.API.checkResponse(results.users[0], 'user');
                done();
            }).catch(done);
        });

        it('editor can read', function (done) {
            UsersAPI.read({id: 1, context: {user: 2}}).then(function (results) {
                should.exist(results);
                testUtils.API.checkResponse(results, 'users');
                results.users[0].id.should.eql(1);
                testUtils.API.checkResponse(results.users[0], 'user');
                done();
            }).catch(done);
        });

        it('author can read', function (done) {
            UsersAPI.read({id: 1, context: {user: 3}}).then(function (results) {
                should.exist(results);
                testUtils.API.checkResponse(results, 'users');
                results.users[0].id.should.eql(1);
                testUtils.API.checkResponse(results.users[0], 'user');
                done();
            }).catch(done);
        });

        it('no-auth can read', function (done) {
            UsersAPI.read({id: 1}).then(function (results) {
                should.exist(results);
                testUtils.API.checkResponse(results, 'users');
                results.users[0].id.should.eql(1);
                testUtils.API.checkResponse(results.users[0], 'user');
                done();
            }).catch(done);
        });

        it('admin can edit', function (done) {
            UsersAPI.edit({users: [{name: 'Joe Blogger'}]}, {id: 1, context: {user: 1}}).then(function (response) {
                should.exist(response);
                testUtils.API.checkResponse(response, 'users');
                response.users.should.have.length(1);
                testUtils.API.checkResponse(response.users[0], 'user');
                response.users[0].name.should.equal('Joe Blogger');

                done();
            }).catch(done);
        });

        it('editor can edit', function (done) {
            UsersAPI.edit({users: [{name: 'Joe Blogger'}]}, {id: 1, context: {user: 2}}).then(function (response) {
                should.exist(response);
                testUtils.API.checkResponse(response, 'users');
                response.users.should.have.length(1);
                testUtils.API.checkResponse(response.users[0], 'user');
                response.users[0].name.should.eql('Joe Blogger');

                done();
            }).catch(done);
        });

        it('author can edit only self', function (done) {
            // Test author cannot edit admin user
            UsersAPI.edit({users: [{name: 'Joe Blogger'}]}, {id: 1, context: {user: 3}}).then(function () {
                done(new Error('Author should not be able to edit account which is not their own'));
            }).catch(function (error) {
                error.type.should.eql('NoPermissionError');
            }).finally(function () {
                // Next test that author CAN edit self
                return UsersAPI.edit({users: [{name: 'Timothy Bogendath'}]}, {id: 3, context: {user: 3}})
                    .then(function (response) {
                        should.exist(response);
                        testUtils.API.checkResponse(response, 'users');
                        response.users.should.have.length(1);
                        testUtils.API.checkResponse(response.users[0], 'user');
                        response.users[0].name.should.eql('Timothy Bogendath');
                        done();
                    }).catch(done);
            });
        });
    });
});