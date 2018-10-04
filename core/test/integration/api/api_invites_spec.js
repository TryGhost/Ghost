var should = require('should'),
    sinon = require('sinon'),
    testUtils = require('../../utils'),
    _ = require('lodash'),
    ObjectId = require('bson-objectid'),
    Promise = require('bluebird'),
    InvitesAPI = require('../../../server/api/v0.1/invites'),
    mail = require('../../../server/api/v0.1/mail'),
    common = require('../../../server/lib/common'),
    context = testUtils.context,

    sandbox = sinon.sandbox.create();

describe.skip('Invites API', function () {
    before(testUtils.teardown);
    before(testUtils.setup('invites', 'settings', 'users:roles', 'perms:invite', 'perms:init'));

    beforeEach(function () {
        sandbox.stub(mail, 'send').callsFake(function () {
            return Promise.resolve();
        });
    });

    afterEach(function () {
        sandbox.restore();
    });

    after(testUtils.teardown);

    describe('Permissions', function () {
        function checkForErrorType(type, done) {
            return function checkForErrorType(error) {
                if (error.errorType) {
                    error.errorType.should.eql(type);
                    done();
                } else {
                    done(error);
                }
            };
        }

        function checkAddResponse(response) {
            should.exist(response);
            should.exist(response.invites);
            should.not.exist(response.meta);

            response.invites.should.have.length(1);
            testUtils.API.checkResponse(response.invites[0], 'invites');
            response.invites[0].created_at.should.be.an.instanceof(Date);
        }

        describe('Owner', function () {
            it('CANNOT invite an Owner', function (done) {
                InvitesAPI.add({
                    invites: [
                        {
                            email: 'test@example.com',
                            role_id: testUtils.roles.ids.owner
                        }
                    ]
                }, context.owner).then(function () {
                    done(new Error('Owner should not be able to add an owner'));
                }).catch(checkForErrorType('NoPermissionError', done));
            });

            it('Can invite an Admin', function (done) {
                InvitesAPI.add({
                    invites: [
                        {
                            email: 'test@example.com',
                            role_id: testUtils.roles.ids.admin
                        }
                    ]
                }, testUtils.context.owner).then(function (response) {
                    checkAddResponse(response);
                    response.invites[0].role_id.should.equal(testUtils.roles.ids.admin);
                    done();
                }).catch(done);
            });

            it('Can invite an Editor', function (done) {
                InvitesAPI.add({
                    invites: [
                        {
                            email: 'test@example.com',
                            role_id: testUtils.roles.ids.editor
                        }
                    ]
                }, testUtils.context.owner).then(function (response) {
                    checkAddResponse(response);
                    response.invites[0].role_id.should.equal(testUtils.roles.ids.editor);
                    done();
                }).catch(done);
            });

            it('Can invite an Author', function (done) {
                InvitesAPI.add({
                    invites: [
                        {
                            email: 'test@example.com',
                            role_id: testUtils.roles.ids.author
                        }
                    ]
                }, testUtils.context.owner).then(function (response) {
                    checkAddResponse(response);
                    response.invites[0].role_id.should.equal(testUtils.roles.ids.author);
                    done();
                }).catch(done);
            });

            it('Can invite a Contributor', function (done) {
                InvitesAPI.add({
                    invites: [
                        {
                            email: 'test@example.com',
                            role_id: testUtils.roles.ids.contributor
                        }
                    ]
                }, testUtils.context.owner).then(function (response) {
                    checkAddResponse(response);
                    response.invites[0].role_id.should.equal(testUtils.roles.ids.contributor);
                    done();
                }).catch(done);
            });

            it('Can invite with role set as string', function (done) {
                InvitesAPI.add({
                    invites: [
                        {
                            email: 'test@example.com',
                            role_id: testUtils.roles.ids.author.toString()
                        }
                    ]
                }, testUtils.context.owner).then(function (response) {
                    checkAddResponse(response);
                    response.invites[0].role_id.should.equal(testUtils.roles.ids.author);
                    done();
                }).catch(done);
            });
        });

        describe('Admin', function () {
            it('CANNOT invite an Owner', function (done) {
                InvitesAPI.add({
                    invites: [
                        {
                            email: 'test@example.com',
                            role_id: testUtils.roles.ids.owner
                        }
                    ]
                }, testUtils.context.admin).then(function () {
                    done(new Error('Admin should not be able to add an owner'));
                }).catch(checkForErrorType('NoPermissionError', done));
            });

            it('Can invite an Admin', function (done) {
                InvitesAPI.add({
                    invites: [
                        {
                            email: 'test@example.com',
                            role_id: testUtils.roles.ids.admin
                        }
                    ]
                }, _.merge({}, {include: 'roles'}, testUtils.context.admin)).then(function (response) {
                    checkAddResponse(response);
                    response.invites[0].role_id.should.equal(testUtils.roles.ids.admin);
                    done();
                }).catch(done);
            });

            it('Can invite an Editor', function (done) {
                InvitesAPI.add({
                    invites: [
                        {
                            email: 'test@example.com',
                            role_id: testUtils.roles.ids.editor
                        }
                    ]
                }, testUtils.context.admin).then(function (response) {
                    checkAddResponse(response);
                    response.invites[0].role_id.should.equal(testUtils.roles.ids.editor);
                    done();
                }).catch(done);
            });

            it('Can invite an Author', function (done) {
                InvitesAPI.add({
                    invites: [
                        {
                            email: 'test@example.com',
                            role_id: testUtils.roles.ids.author
                        }
                    ]
                }, testUtils.context.admin).then(function (response) {
                    checkAddResponse(response);
                    response.invites[0].role_id.should.equal(testUtils.roles.ids.author);
                    done();
                }).catch(done);
            });

            it('Can invite a Contributor', function (done) {
                InvitesAPI.add({
                    invites: [
                        {
                            email: 'test@example.com',
                            role_id: testUtils.roles.ids.contributor
                        }
                    ]
                }, testUtils.context.admin).then(function (response) {
                    checkAddResponse(response);
                    response.invites[0].role_id.should.equal(testUtils.roles.ids.contributor);
                    done();
                }).catch(done);
            });
        });

        describe('Editor', function () {
            it('CANNOT invite an Owner', function (done) {
                InvitesAPI.add({
                    invites: [
                        {
                            email: 'test@example.com',
                            role_id: testUtils.roles.ids.owner
                        }
                    ]
                }, context.editor).then(function () {
                    done(new Error('Editor should not be able to invite an owner'));
                }).catch(checkForErrorType('NoPermissionError', done));
            });

            it('CANNOT invite an Adminstrator', function (done) {
                InvitesAPI.add({
                    invites: [
                        {
                            email: 'test@example.com',
                            role_id: testUtils.roles.ids.admin
                        }
                    ]
                }, context.editor).then(function () {
                    done(new Error('Editor should not be able to invite an administrator'));
                }).catch(checkForErrorType('NoPermissionError', done));
            });

            it('CANNOT invite an Editor', function (done) {
                InvitesAPI.add({
                    invites: [
                        {
                            email: 'test@example.com',
                            role_id: testUtils.roles.ids.editor
                        }
                    ]
                }, context.editor).then(function () {
                    done(new Error('Editor should not be able to invite an editor'));
                }).catch(checkForErrorType('NoPermissionError', done));
            });

            it('Can invite an Author', function (done) {
                InvitesAPI.add({
                    invites: [
                        {
                            email: 'test@example.com',
                            role_id: testUtils.roles.ids.author
                        }
                    ]
                }, context.editor).then(function (response) {
                    checkAddResponse(response);
                    response.invites[0].role_id.should.equal(testUtils.roles.ids.author);
                    done();
                }).catch(done);
            });

            it('Can invite a Contributor', function (done) {
                InvitesAPI.add({
                    invites: [
                        {
                            email: 'test@example.com',
                            role_id: testUtils.roles.ids.contributor
                        }
                    ]
                }, context.editor).then(function (response) {
                    checkAddResponse(response);
                    response.invites[0].role_id.should.equal(testUtils.roles.ids.contributor);
                    done();
                }).catch(done);
            });
        });
    });
});
