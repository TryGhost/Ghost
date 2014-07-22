/*globals describe, before, beforeEach, afterEach, it */
var testUtils = require('../../utils'),
    should    = require('should'),

    permissions   = require('../../../server/permissions'),
    UserModel = require('../../../server/models').User;

    // Stuff we are testing
    UsersAPI      = require('../../../server/api/users');
    AuthAPI      = require('../../../server/api/authentication');

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
            AuthAPI.setup({ setup: [{
                'name': 'Hello World',
                'email': 'hello@world.com',
                'password': 'password'
            }]}).then(function (results) {
                should.exist(results);
                should.not.exist(results.meta);
                should.exist(results.users);
                results.users.should.have.length(1);
                testUtils.API.checkResponse(results.users[0], 'user', ['roles']);
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
                return testUtils.insertAdminUser();
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

        it('dateTime fields are returned as Date objects', function (done) {
            var userData = testUtils.DataGenerator.forModel.users[0];

            UserModel.check({ email: userData.email, password: userData.password }).then(function (user) {
                return UsersAPI.read({ id: user.id });
            }).then(function (results) {
                results.users[0].created_at.should.be.an.instanceof(Date);
                results.users[0].updated_at.should.be.an.instanceof(Date);
                results.users[0].last_login.should.be.an.instanceof(Date);

                done();
            }).catch(done);
        });

        it('can browse (owner)', function (done) {
            UsersAPI.browse({context: {user: 1}}).then(function (results) {
                should.exist(results);
                testUtils.API.checkResponse(results, 'users');
                should.exist(results.users);
                results.users.should.have.length(4);
                testUtils.API.checkResponse(results.users[0], 'user', ['roles']);
                testUtils.API.checkResponse(results.users[1], 'user', ['roles']);
                testUtils.API.checkResponse(results.users[2], 'user', ['roles']);
                testUtils.API.checkResponse(results.users[3], 'user', ['roles']);

                done();
            }).catch(done);
        });

        it('can browse (admin)', function (done) {
            UsersAPI.browse({context: {user: 2}}).then(function (results) {
                should.exist(results);
                testUtils.API.checkResponse(results, 'users');
                should.exist(results.users);
                results.users.should.have.length(4);
                testUtils.API.checkResponse(results.users[0], 'user', ['roles']);
                testUtils.API.checkResponse(results.users[1], 'user', ['roles']);
                testUtils.API.checkResponse(results.users[2], 'user', ['roles']);
                testUtils.API.checkResponse(results.users[3], 'user', ['roles']);
                done();
            }).catch(done);
        });

        it('can browse (editor)', function (done) {
            UsersAPI.browse({context: {user: 3}}).then(function (results) {
                should.exist(results);
                testUtils.API.checkResponse(results, 'users');
                should.exist(results.users);
                results.users.should.have.length(4);
                testUtils.API.checkResponse(results.users[0], 'user', ['roles']);
                testUtils.API.checkResponse(results.users[1], 'user', ['roles']);
                testUtils.API.checkResponse(results.users[2], 'user', ['roles']);
                testUtils.API.checkResponse(results.users[3], 'user', ['roles']);
                done();
            }).catch(done);
        });

        it('can browse (author)', function (done) {
            UsersAPI.browse({context: {user: 4}}).then(function (results) {
                should.exist(results);
                testUtils.API.checkResponse(results, 'users');
                should.exist(results.users);
                results.users.should.have.length(4);
                testUtils.API.checkResponse(results.users[0], 'user', ['roles']);
                testUtils.API.checkResponse(results.users[1], 'user', ['roles']);
                testUtils.API.checkResponse(results.users[2], 'user', ['roles']);
                testUtils.API.checkResponse(results.users[3], 'user', ['roles']);
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

        it('can read (owner)', function (done) {
            UsersAPI.read({id: 1, context: {user: 1}}).then(function (results) {
                should.exist(results);
                should.not.exist(results.meta);
                should.exist(results.users);
                results.users[0].id.should.eql(1);
                testUtils.API.checkResponse(results.users[0], 'user', ['roles']);

                results.users[0].created_at.should.be.a.Date;

                done();
            }).catch(done);
        });

        it('can read (admin)', function (done) {
            UsersAPI.read({id: 1, context: {user: 2}}).then(function (results) {
                should.exist(results);
                should.not.exist(results.meta);
                should.exist(results.users);
                results.users[0].id.should.eql(1);
                testUtils.API.checkResponse(results.users[0], 'user', ['roles']);

                results.users[0].created_at.should.be.a.Date;

                done();
            }).catch(done);
        });

        it('can read (editor)', function (done) {
            UsersAPI.read({id: 1, context: {user: 3}}).then(function (results) {
                should.exist(results);
                should.not.exist(results.meta);
                should.exist(results.users);
                results.users[0].id.should.eql(1);
                testUtils.API.checkResponse(results.users[0], 'user', ['roles']);
                done();
            }).catch(done);
        });

        it('can read (author)', function (done) {
            UsersAPI.read({id: 1, context: {user: 4}}).then(function (results) {
                should.exist(results);
                should.not.exist(results.meta);
                should.exist(results.users);
                results.users[0].id.should.eql(1);
                testUtils.API.checkResponse(results.users[0], 'user', ['roles']);
                done();
            }).catch(done);
        });

        it('no-auth can read', function (done) {
            UsersAPI.read({id: 1}).then(function (results) {
                should.exist(results);
                should.not.exist(results.meta);
                should.exist(results.users);
                results.users[0].id.should.eql(1);
                testUtils.API.checkResponse(results.users[0], 'user', ['roles']);
                done();
            }).catch(done);
        });

        it('can edit (owner)', function (done) {
            UsersAPI.edit({users: [{name: 'Joe Blogger'}]}, {id: 1, context: {user: 1}}).then(function (response) {
                should.exist(response);
                should.not.exist(response.meta);
                should.exist(response.users);
                response.users.should.have.length(1);
                testUtils.API.checkResponse(response.users[0], 'user', ['roles']);
                response.users[0].name.should.equal('Joe Blogger');
                response.users[0].updated_at.should.be.a.Date;
                done();
            }).catch(done);
        });

        it('can edit (admin)', function (done) {
            UsersAPI.edit({users: [{name: 'Joe Blogger'}]}, {id: 1, context: {user: 2}}).then(function (response) {
                should.exist(response);
                should.not.exist(response.meta);
                should.exist(response.users);
                response.users.should.have.length(1);
                testUtils.API.checkResponse(response.users[0], 'user', ['roles']);
                response.users[0].name.should.equal('Joe Blogger');
                response.users[0].updated_at.should.be.a.Date;
                done();
            }).catch(done);
        });

        it('can edit (editor)', function (done) {
            UsersAPI.edit({users: [{name: 'Joe Blogger'}]}, {id: 1, context: {user: 2}}).then(function (response) {
                should.exist(response);
                should.not.exist(response.meta);
                should.exist(response.users);
                response.users.should.have.length(1);
                testUtils.API.checkResponse(response.users[0], 'user', ['roles']);
                response.users[0].name.should.equal('Joe Blogger');
                response.users[0].updated_at.should.be.a.Date;
                done();
            }).catch(done);
        });

        it('author can edit only self', function (done) {
            // Test author cannot edit admin user
            UsersAPI.edit({users: [{name: 'Joe Blogger'}]}, {id: 1, context: {user: 4}}).then(function () {
                done(new Error('Author should not be able to edit account which is not their own'));
            }).catch(function (error) {
                error.type.should.eql('NoPermissionError');
            }).finally(function () {
                // Next test that author CAN edit self
                return UsersAPI.edit({users: [{name: 'Timothy Bogendath'}]}, {id: 4, context: {user: 4}})
                    .then(function (response) {
                        should.exist(response);
                        should.not.exist(response.meta);
                        should.exist(response.users);
                        response.users.should.have.length(1);
                        testUtils.API.checkResponse(response.users[0], 'user', ['roles']);
                        response.users[0].name.should.eql('Timothy Bogendath');
                        done();
                    }).catch(done);
            });
        });

        it('admin can\'t transfer ownership', function (done) {
            // transfer ownership to user id: 2
            UsersAPI.edit({users: [{name: 'Joe Blogger', roles:[4]}]}, {id: 3, context: {user: 2}}).then(function (response) {
                done(new Error('Admin is not dienied transferring ownership.'));
            }, function () {
                done();
            }).catch(done);
        });

        it('editor can\'t transfer ownership', function (done) {
            // transfer ownership to user id: 2
            UsersAPI.edit({users: [{name: 'Joe Blogger', roles:[4]}]}, {id: 2, context: {user: 3}}).then(function (response) {
                done(new Error('Admin is not dienied transferring ownership.'));
            }, function () {
                done();
            }).catch(done);
        });

        it('author can\'t transfer ownership', function (done) {
            // transfer ownership to user id: 2
            UsersAPI.edit({users: [{name: 'Joe Blogger', roles:[4]}]}, {id: 2, context: {user: 4}}).then(function (response) {
                done(new Error('Admin is not dienied transferring ownership.'));
            }, function () {
                done();
            }).catch(done);
        });

        it('owner can transfer ownership', function (done) {
            // transfer ownership to user id: 2
            UsersAPI.edit({users: [{name: 'Joe Blogger', roles:[4]}]}, {id: 2, context: {user: 1}}).then(function (response) {
                should.exist(response);
                should.not.exist(response.meta);
                should.exist(response.users);
                response.users.should.have.length(1);
                testUtils.API.checkResponse(response.users[0], 'user', ['roles']);
                response.users[0].name.should.equal('Joe Blogger');
                response.users[0].id.should.equal(2);
                response.users[0].roles[0].should.equal(4);
                response.users[0].updated_at.should.be.a.Date;
                done();
            }).catch(done);
        });
    });
});
