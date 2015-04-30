/*globals describe, before, beforeEach, afterEach, it */
/*jshint expr:true*/
var testUtils   = require('../../utils'),
    should      = require('should'),
    Promise     = require('bluebird'),
    rewire      = require('rewire'),

    // Stuff we are testing
    mail        = rewire('../../../server/api/mail'),
    AuthAPI     = require('../../../server/api/authentication');

describe('Authentication API', function () {
    // Keep the DB clean
    before(testUtils.teardown);
    afterEach(testUtils.teardown);

    should.exist(AuthAPI);

    describe('Setup', function () {
        describe('Not completed', function () {
            // TODO: stub settings
            beforeEach(testUtils.setup('roles', 'owner:pre', 'settings', 'perms:setting', 'perms:mail', 'perms:init'));

            it('should report that setup has not been completed', function (done) {
                AuthAPI.isSetup().then(function (result) {
                    should.exist(result);
                    result.setup[0].status.should.be.false;

                    done();
                }).catch(done);
            });

            it('should allow setup to be completed', function (done) {
                var setupData = {
                    name: 'test user',
                    email: 'test@example.com',
                    password: 'areallygoodpassword',
                    title: 'a test blog'
                },

                send = mail.__get__('mail.send');

                mail.__set__('mail.send', function () {
                    return Promise.resolve();
                });

                AuthAPI.setup({setup: [setupData]}).then(function (result) {
                    should.exist(result);
                    should.exist(result.users);
                    should.not.exist(result.meta);
                    result.users.should.have.length(1);
                    testUtils.API.checkResponse(result.users[0], 'user');

                    var newUser = result.users[0];

                    newUser.id.should.equal(1);
                    newUser.name.should.equal(setupData.name);
                    newUser.email.should.equal(setupData.email);

                    done();
                }).catch(done).finally(function () {
                    mail.__set__('mail.send', send);
                });
            });
        });

        describe('Completed', function () {
            beforeEach(testUtils.setup('owner'));

            it('should report that setup has been completed', function (done) {
                AuthAPI.isSetup().then(function (result) {
                    should.exist(result);
                    result.setup[0].status.should.be.true;

                    done();
                }).catch(done);
            });

            it('should not allow setup to be run again', function (done) {
                var setupData = {
                    name: 'test user',
                    email: 'test@example.com',
                    password: 'areallygoodpassword',
                    title: 'a test blog'
                };

                AuthAPI.setup({setup: [setupData]}).then(function () {
                    done(new Error('Setup was able to be run'));
                }).catch(function (err) {
                    should.exist(err);

                    err.name.should.equal('NoPermissionError');
                    err.code.should.equal(403);

                    done();
                });
            });
        });
    });

    // describe('Authentication', function () {

    //    describe('Setup not completed', function () {

    //        beforeEach(testUtils.setup());

    //        it('should not allow an invitation to be accepted', function (done) {
    //            AuthAPI.acceptInvitation().then(function () {
    //                done(new Error('Invitation was allowed to be accepted'));
    //            }).catch(function (err) {
    //                should.exist(err);

    //                err.name.should.equal('NoPermissionError');
    //                err.code.should.equal(403);

    //                done();
    //            });
    //        });

    //        it('should not generate a password reset token', function (done) {
    //            AuthAPI.generateResetToken().then(function () {
    //                done(new Error('Reset token was generated'));
    //            }).catch(function (err) {
    //                should.exist(err);

    //                err.name.should.equal('NoPermissionError');
    //                err.code.should.equal(403);

    //                done();
    //            });
    //        });

    //        it('should not allow a password reset', function (done) {
    //            AuthAPI.resetPassword().then(function () {
    //                done(new Error('Password was reset'));
    //            }).catch(function (err) {
    //                should.exist(err);

    //                err.name.should.equal('NoPermissionError');
    //                err.code.should.equal(403);

    //                done();
    //            });
    //        });
    //    });
    // });
});
