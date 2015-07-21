/*globals describe, before, beforeEach, afterEach, it */
/*jshint expr:true*/
var testUtils   = require('../../utils'),
    should      = require('should'),
    sinon       = require('sinon'),
    Promise     = require('bluebird'),

    // Stuff we are testing

    AuthAPI     = require('../../../server/api/authentication'),
    mail        = require('../../../server/api/mail'),
    context     = testUtils.context,

    sandbox     = sinon.sandbox.create();

describe('Authentication API', function () {
    var testInvite = {
            invitation: [{
                token: 'abc',
                password: 'abcdefgh',
                email: 'test@testghost.org',
                name: 'Jo Bloggs'
            }]
        },
        testGenerateReset = {
            passwordreset: [{
                email: 'jbloggs@example.com'
            }]
        },
        testReset = {
            passwordreset: [{
                token: 'abc',
                newPassword: 'abcdefgh',
                ne2Password: 'abcdefgh'
            }]
        };

    // Keep the DB clean
    before(testUtils.teardown);
    afterEach(testUtils.teardown);

    // Stub mail
    beforeEach(function () {
        sandbox.stub(mail, 'send', function () {
            return Promise.resolve();
        });
    });
    afterEach(function () {
        sandbox.restore();
    });

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
                    blogTitle: 'a test blog'
                };

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
                }).catch(done);
            });

            it('should not allow an invitation to be accepted', function (done) {
                AuthAPI.acceptInvitation(testInvite).then(function () {
                    done(new Error('Invitation was allowed to be accepted'));
                }).catch(function (err) {
                    should.exist(err);

                    err.name.should.equal('NoPermissionError');
                    err.code.should.equal(403);

                    done();
                });
            });

            it('should not generate a password reset token', function (done) {
                AuthAPI.generateResetToken(testGenerateReset).then(function () {
                    done(new Error('Reset token was generated'));
                }).catch(function (err) {
                    should.exist(err);

                    err.name.should.equal('NoPermissionError');
                    err.code.should.equal(403);

                    done();
                });
            });

            it('should not allow a password reset', function (done) {
                AuthAPI.resetPassword(testReset).then(function () {
                    done(new Error('Password was reset'));
                }).catch(function (err) {
                    should.exist(err);

                    err.name.should.equal('NoPermissionError');
                    err.code.should.equal(403);

                    done();
                });
            });
        });

        describe('Completed', function () {
            beforeEach(testUtils.setup('roles', 'owner', 'settings', 'perms:setting', 'perms:mail', 'perms:init'));

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
                    blogTitle: 'a test blog'
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

            it('should allow an invitation to be accepted, but fail on token validation', function (done) {
                AuthAPI.acceptInvitation(testInvite).then(function () {
                    done(new Error('invitation did not fail on token validation'));
                }).catch(function (err) {
                    should.exist(err);

                    err.name.should.equal('UnauthorizedError');
                    err.code.should.equal(401);
                    err.message.should.equal('Invalid token structure');
                    done();
                });
            });

            it('should generate a password reset token', function (done) {
                AuthAPI.generateResetToken(testGenerateReset).then(function (result) {
                    result.should.exist;
                    result.passwordreset.should.be.an.Array.with.lengthOf(1);
                    result.passwordreset[0].should.have.property('message', 'Check your email for further instructions.');
                    done();
                }).catch(done);
            });

            it('should allow a password reset', function (done) {
                AuthAPI.resetPassword(testReset).then(function () {
                    done(new Error('password reset did not fail on token validation'));
                }).catch(function (err) {
                    should.exist(err);

                    err.name.should.equal('UnauthorizedError');
                    err.code.should.equal(401);
                    err.message.should.equal('Invalid token structure');
                    done();
                });
            });
        });
    });

    describe('Setup Update', function () {
        describe('Setup not complete', function () {
            beforeEach(testUtils.setup('roles', 'owner:pre', 'settings', 'perms:setting', 'perms:init'));

            it('should report that setup has not been completed', function (done) {
                AuthAPI.isSetup().then(function (result) {
                    should.exist(result);
                    result.setup[0].status.should.be.false;

                    done();
                }).catch(done);
            });

            it('should not allow setup to be updated', function (done) {
                var setupData = {
                        name: 'test user',
                        email: 'test@example.com',
                        password: 'areallygoodpassword',
                        blogTitle: 'a test blog'
                    };

                AuthAPI.updateSetup({setup: [setupData]}, {}).then(function () {
                    done(new Error('Update was able to be run'));
                }).catch(function (err) {
                    should.exist(err);

                    err.name.should.equal('NoPermissionError');
                    err.code.should.equal(403);

                    done();
                });
            });
        });

        describe('Not Owner', function () {
            beforeEach(testUtils.setup('roles', 'users:roles', 'settings', 'perms:setting', 'perms:init', 'perms:user'));

            it('should report that setup has been completed', function (done) {
                AuthAPI.isSetup().then(function (result) {
                    should.exist(result);
                    result.setup[0].status.should.be.true;

                    done();
                }).catch(done);
            });

            it('should not allow setup to be updated', function (done) {
                var setupData = {
                        name: 'test user',
                        email: 'test@example.com',
                        password: 'areallygoodpassword',
                        blogTitle: 'a test blog'
                    };

                AuthAPI.updateSetup({setup: [setupData]}, context.author).then(function () {
                    done(new Error('Update was able to be run'));
                }).catch(function (err) {
                    should.exist(err);

                    err.name.should.equal('NoPermissionError');
                    err.code.should.equal(403);

                    done();
                });
            });
        });

        describe('Owner', function () {
            beforeEach(testUtils.setup('roles', 'users:roles', 'settings', 'perms:setting', 'perms:init'));

            it('should report that setup has been completed', function (done) {
                AuthAPI.isSetup().then(function (result) {
                    should.exist(result);
                    result.setup[0].status.should.be.true;

                    done();
                }).catch(done);
            });

            it('should allow setup to be updated', function (done) {
                var setupData = {
                        name: 'test user',
                        email: 'test@example.com',
                        password: 'areallygoodpassword',
                        blogTitle: 'a test blog'
                    };

                AuthAPI.updateSetup({setup: [setupData]}, context.owner).then(function (result) {
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
                }).catch(done);
            });
        });
    });
});
