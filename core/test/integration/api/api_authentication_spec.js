var testUtils = require('../../utils'),
    should = require('should'),
    when = require('when'),
    rewire = require('rewire'),
    mail = rewire('../../../server/api/mail'),
    permissions = require('../../../server/permissions'),
    settings = require('../../../server/api/settings'),

    authentication = require('../../../server/api/authentication');

describe('Authentication API', function () {

    before(function (done) {
        testUtils.clearData().then(function () {
            done();
        }).catch(done);
    });

    describe('Setup', function () {

        describe('Not completed', function () {

            beforeEach(function (done) {
                testUtils.clearData().then(function () {
                    return testUtils.initData().then(function () {
                        return permissions.init().then(function () {
                            return settings.updateSettingsCache();
                        });
                    });
                }).then(function () {
                    done();
                }).catch(done);
            });

            it('should report that setup has not been completed', function (done) {
                authentication.isSetup().then(function (result) {
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
                    return when.resolve();
                });

                authentication.setup({ setup: [setupData] }).then(function (result) {
                    should.exist(result);

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

            beforeEach(function (done) {
                testUtils.clearData().then(function () {
                    return testUtils.initData().then(function () {
                        return testUtils.insertDefaultFixtures().then(function () {
                            return permissions.init().then(function () {
                                return settings.updateSettingsCache();
                            });
                        });
                    });
                }).then(function () {
                    done();
                }).catch(done);
            });

            it('should report that setup has been completed', function (done) {
                authentication.isSetup().then(function (result) {
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

                authentication.setup({ setup: [setupData] }).then(function (result) {
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

    describe('Authentication', function () {

        describe('Setup not completed', function () {

            beforeEach(function (done) {
                testUtils.clearData().then(function () {
                    return testUtils.initData().then(function () {
                        return permissions.init().then(function () {
                            return settings.updateSettingsCache();
                        });
                    });
                }).then(function () {
                    done();
                }).catch(done);
            });

            it('should not allow an invitation to be accepted', function (done) {
                authentication.acceptInvitation().then(function () {
                    done(new Error('Invitation was allowed to be accepted'));
                }).catch(function (err) {
                    should.exist(err);

                    err.name.should.equal('NoPermissionError');
                    err.code.should.equal(403);

                    done();
                });
            });

            it('should not generate a password reset token', function (done) {
                authentication.generateResetToken().then(function () {
                    done(new Error('Reset token was generated'));
                }).catch(function (err) {
                    should.exist(err);

                    err.name.should.equal('NoPermissionError');
                    err.code.should.equal(403);

                    done();
                });
            });

            it('should not allow a password reset', function (done) {
                authentication.resetPassword().then(function () {
                    done(new Error('Password was reset'));
                }).catch(function (err) {
                    should.exist(err);

                    err.name.should.equal('NoPermissionError');
                    err.code.should.equal(403);

                    done();
                });
            });
        });
    });
});
