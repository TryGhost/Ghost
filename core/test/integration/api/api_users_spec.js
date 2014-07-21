/*globals describe, before, beforeEach, afterEach, it */
/*jshint expr:true*/
var testUtils   = require('../../utils'),
    should      = require('should'),
    _           = require('lodash'),

    // Stuff we are testing
    UserModel   = require('../../../server/models').User,
    UserAPI    = require('../../../server/api/users');

describe('Users API', function () {
    // Keep the DB clean
    before(testUtils.teardown);
    afterEach(testUtils.teardown);
    beforeEach(testUtils.setup('users:roles', 'perms:user', 'perms:init'));

    before(function (done) {
        testUtils.clearData().then(function () {
            done();
        }).catch(done);
    });

    it('dateTime fields are returned as Date objects', function (done) {
        var userData = testUtils.DataGenerator.forModel.users[0];

        UserModel.check({ email: userData.email, password: userData.password }).then(function (user) {
            return UserAPI.read({ id: user.id });
        }).then(function (response) {
            response.users[0].created_at.should.be.an.instanceof(Date);
            response.users[0].updated_at.should.be.an.instanceof(Date);
            response.users[0].last_login.should.be.an.instanceof(Date);

            done();
        }).catch(done);
    });

    it('Can browse (admin)', function (done) {
        UserAPI.browse(testUtils.context.admin).then(function (response) {
            should.exist(response);
            testUtils.API.checkResponse(response, 'users');
            should.exist(response.users);
            response.users.should.have.length(4);
            testUtils.API.checkResponse(response.users[0], 'user', ['roles']);
            testUtils.API.checkResponse(response.users[1], 'user', ['roles']);
            testUtils.API.checkResponse(response.users[2], 'user', ['roles']);
            testUtils.API.checkResponse(response.users[3], 'user', ['roles']);

            done();
        }).catch(done);
    });

    it('Can browse (editor)', function (done) {
        UserAPI.browse(testUtils.context.editor).then(function (response) {
            should.exist(response);
            testUtils.API.checkResponse(response, 'users');
            should.exist(response.users);
            response.users.should.have.length(4);
            testUtils.API.checkResponse(response.users[0], 'user', ['roles']);
            testUtils.API.checkResponse(response.users[1], 'user', ['roles']);
            testUtils.API.checkResponse(response.users[2], 'user', ['roles']);
            testUtils.API.checkResponse(response.users[3], 'user', ['roles']);
            done();
        }).catch(done);
    });

    it('Can browse (author)', function (done) {
        UserAPI.browse(testUtils.context.author).then(function (response) {
            should.exist(response);
            testUtils.API.checkResponse(response, 'users');
            should.exist(response.users);
            response.users.should.have.length(4);
            testUtils.API.checkResponse(response.users[0], 'user', ['roles']);
            testUtils.API.checkResponse(response.users[1], 'user', ['roles']);
            testUtils.API.checkResponse(response.users[2], 'user', ['roles']);
            testUtils.API.checkResponse(response.users[3], 'user', ['roles']);
            done();
        }).catch(done);
    });

    it('no-auth user cannot browse', function (done) {
        UserAPI.browse().then(function () {
            done(new Error('Browse user is not denied without authentication.'));
        }, function () {
            done();
        }).catch(done);
    });

    it('Can read (admin)', function (done) {
        UserAPI.read(_.extend(testUtils.context.admin, {id: 1})).then(function (response) {
            should.exist(response);
            should.not.exist(response.meta);
            should.exist(response.users);
            response.users[0].id.should.eql(1);
            testUtils.API.checkResponse(response.users[0], 'user', ['roles']);
            response.users[0].created_at.should.be.a.Date;

            done();
        }).catch(done);
    });

    it('Can read (editor)', function (done) {
        UserAPI.read(_.extend(testUtils.context.editor, {id: 1})).then(function (response) {
            should.exist(response);
            should.not.exist(response.meta);
            should.exist(response.users);
            response.users[0].id.should.eql(1);
            testUtils.API.checkResponse(response.users[0], 'user', ['roles']);
            done();
        }).catch(done);
    });

    it('Can read (author)', function (done) {
        UserAPI.read(_.extend(testUtils.context.author, {id: 1})).then(function (response) {
            should.exist(response);
            should.not.exist(response.meta);
            should.exist(response.users);
            response.users[0].id.should.eql(1);
            testUtils.API.checkResponse(response.users[0], 'user', ['roles']);
            done();
        }).catch(done);
    });

    it('no-auth can read', function (done) {
        UserAPI.read({id: 1}).then(function (response) {
            should.exist(response);
            should.not.exist(response.meta);
            should.exist(response.users);
            response.users[0].id.should.eql(1);
            testUtils.API.checkResponse(response.users[0], 'user', ['roles']);
            done();
        }).catch(done);
    });

    it('Can edit (admin)', function (done) {
        UserAPI.edit(
            {users: [{name: 'Joe Blogger'}]}, _.extend(testUtils.context.admin, {id: 1})
        ).then(function (response) {
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

    it('Can edit (editor)', function (done) {
        UserAPI.edit(
            {users: [{name: 'Joe Blogger'}]}, _.extend(testUtils.context.editor, {id: 1})
        ).then(function (response) {
                should.exist(response);
                should.not.exist(response.meta);
                should.exist(response.users);
                response.users.should.have.length(1);
                testUtils.API.checkResponse(response.users[0], 'user', ['roles']);
                response.users[0].name.should.eql('Joe Blogger');

                done();
            }).catch(done);
    });

    it('Can edit only self (author)', function (done) {
        // Test author cannot edit admin user
        UserAPI.edit(
            {users: [{name: 'Joe Blogger'}]}, _.extend(testUtils.context.author, {id: 1})
        ).then(function () {
            done(new Error('Author should not be able to edit account which is not their own'));
        }).catch(function (error) {
            error.type.should.eql('NoPermissionError');
        }).finally(function () {
            // Next test that author CAN edit self
            return UserAPI.edit(
                {users: [{name: 'Timothy Bogendath'}]}, _.extend(testUtils.context.author, {id: 4})
            ).then(function (response) {
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

    it('can\'t transfer ownership (admin)', function (done) {
        // transfer ownership to user id: 2
        UserAPI.edit(
            {users: [{name: 'Joe Blogger', roles:[4]}]}, _.extend(testUtils.context.admin, {id: 2})
        ).then(function () {
            done(new Error('Admin is not dienied transferring ownership.'));
        }, function () {
            done();
        }).catch(done);
    });

    it('can\'t transfer ownership (editor)', function (done) {
        // transfer ownership to user id: 2
        UserAPI.edit(
            {users: [{name: 'Joe Blogger', roles:[4]}]}, _.extend(testUtils.context.editor, {id: 2})
        ).then(function () {
            done(new Error('Admin is not dienied transferring ownership.'));
        }, function () {
            done();
        }).catch(done);
    });

    it('can\'t transfer ownership (author)', function (done) {
        // transfer ownership to user id: 2
        UserAPI.edit(
            {users: [{name: 'Joe Blogger', roles:[4]}]}, _.extend(testUtils.context.author, {id: 2})
        ).then(function () {
            done(new Error('Admin is not dienied transferring ownership.'));
        }, function () {
            done();
        }).catch(done);
    });

    it('can transfer ownership (owner)', function (done) {
        // transfer ownership to user id: 2
        UserAPI.edit(
            {users: [{name: 'Joe Blogger', roles:[4]}]}, _.extend(testUtils.context.owner, {id: 2})
        ).then(function (response) {
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