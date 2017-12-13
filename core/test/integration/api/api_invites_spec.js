var should = require('should'),
    sinon = require('sinon'),
    testUtils = require('../../utils'),
    _ = require('lodash'),
    ObjectId = require('bson-objectid'),
    Promise = require('bluebird'),
    InvitesAPI = require('../../../server/api/invites'),
    mail = require('../../../server/api/mail'),
    common = require('../../../server/lib/common'),
    context = testUtils.context,

    sandbox = sinon.sandbox.create();

describe('Invites API', function () {
    beforeEach(testUtils.teardown);
    beforeEach(testUtils.setup('invites', 'settings', 'users:roles', 'perms:invite', 'perms:init'));

    beforeEach(function () {
        sandbox.stub(mail, 'send').callsFake(function () {
            return Promise.resolve();
        });
    });

    afterEach(function () {
        sandbox.restore();
    });

    after(testUtils.teardown);

    describe('CRUD', function () {
        describe('Add', function () {
            it('add invite 1', function (done) {
                InvitesAPI.add({
                    invites: [{email: 'test@example.com', role_id: testUtils.roles.ids.editor}]
                }, testUtils.context.owner)
                    .then(function (response) {
                        response.invites.length.should.eql(1);
                        response.invites[0].role_id.should.eql(testUtils.roles.ids.editor);
                        done();
                    }).catch(done);
            });

            it('add invite 2', function (done) {
                InvitesAPI.add({
                    invites: [{email: 'test2@example.com', role_id: testUtils.roles.ids.author}]
                }, testUtils.context.owner)
                    .then(function (response) {
                        response.invites.length.should.eql(1);
                        response.invites[0].role_id.should.eql(testUtils.roles.ids.author);
                        done();
                    }).catch(done);
            });

            it('add invite: empty invites object', function (done) {
                InvitesAPI.add({invites: []}, testUtils.context.owner)
                    .then(function () {
                        throw new Error('expected validation error');
                    })
                    .catch(function (err) {
                        should.exist(err);
                        done();
                    });
            });

            it('add invite: no email provided', function (done) {
                InvitesAPI.add({invites: [{status: 'sent'}]}, testUtils.context.owner)
                    .then(function () {
                        throw new Error('expected validation error');
                    })
                    .catch(function (err) {
                        (err instanceof common.errors.ValidationError).should.eql(true);
                        done();
                    });
            });

            it('add invite: invite existing user', function (done) {
                InvitesAPI.add({
                    invites: [{
                        email: testUtils.DataGenerator.Content.users[0].email,
                        role_id: testUtils.roles.ids.author
                    }]
                }, testUtils.context.owner)
                    .then(function () {
                        throw new Error('expected validation error');
                    })
                    .catch(function (err) {
                        (err instanceof common.errors.ValidationError).should.eql(true);
                        done();
                    });
            });
        });

        describe('Browse', function () {
            it('browse invites', function (done) {
                InvitesAPI.browse(testUtils.context.owner)
                    .then(function (response) {
                        response.invites.length.should.eql(2);

                        response.invites[0].status.should.eql('sent');
                        response.invites[0].email.should.eql('test1@ghost.org');
                        response.invites[0].role_id.should.eql(testUtils.roles.ids.admin);

                        response.invites[1].status.should.eql('sent');
                        response.invites[1].email.should.eql('test2@ghost.org');
                        response.invites[1].role_id.should.eql(testUtils.roles.ids.author);

                        should.not.exist(response.invites[0].token);
                        should.exist(response.invites[0].expires);

                        should.not.exist(response.invites[1].token);
                        should.exist(response.invites[1].expires);

                        done();
                    }).catch(done);
            });
        });

        describe('Read', function () {
            it('read invites: not found', function (done) {
                InvitesAPI.read(_.merge({}, testUtils.context.owner, {
                    email: 'not-existend@hey.org'
                })).then(function () {
                    throw new Error('expected not found error for invite');
                }).catch(function (err) {
                    (err instanceof common.errors.NotFoundError).should.eql(true);
                    done();
                });
            });

            it('read invite', function (done) {
                InvitesAPI.read(_.merge({}, {email: 'test1@ghost.org'}, testUtils.context.owner))
                    .then(function (response) {
                        response.invites.length.should.eql(1);
                        response.invites[0].role_id.should.eql(testUtils.roles.ids.admin);
                        done();
                    }).catch(done);
            });

            it('read invite', function (done) {
                InvitesAPI.read(_.merge({}, testUtils.context.owner, {email: 'test2@ghost.org'}))
                    .then(function (response) {
                        response.invites.length.should.eql(1);
                        response.invites[0].role_id.should.eql(testUtils.roles.ids.author);
                        done();
                    }).catch(done);
            });
        });

        describe('Destroy', function () {
            it('destroy invite', function (done) {
                InvitesAPI.destroy(_.merge({}, testUtils.context.owner, {id: testUtils.DataGenerator.forKnex.invites[0].id}))
                    .then(function () {
                        return InvitesAPI.read(_.merge({}, testUtils.context.owner, {
                            email: 'test1@ghost.org'
                        })).catch(function (err) {
                            (err instanceof common.errors.NotFoundError).should.eql(true);
                            done();
                        });
                    }).catch(done);
            });

            it('destroy invite: id does not exist', function (done) {
                InvitesAPI.destroy(_.merge({id: ObjectId.generate()}, testUtils.context.owner))
                    .then(function () {
                        throw new Error('expect error on destroy invite');
                    })
                    .catch(function (err) {
                        (err instanceof common.errors.NotFoundError).should.eql(true);
                        done();
                    });
            });
        });
    });

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
                }, _.merge({}, {include: ['roles']}, testUtils.context.admin)).then(function (response) {
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
        });

        describe('Author', function () {
            it('CANNOT invite an Owner', function (done) {
                InvitesAPI.add({
                    invites: [
                        {
                            email: 'test@example.com',
                            role_id: testUtils.roles.ids.owner
                        }
                    ]
                }, context.author).then(function () {
                    done(new Error('Author should not be able to add an owner'));
                }).catch(checkForErrorType('NoPermissionError', done));
            });

            it('CANNOT invite an Author', function (done) {
                InvitesAPI.add({
                    invites: [
                        {
                            email: 'test@example.com',
                            role_id: testUtils.roles.ids.author
                        }
                    ]
                }, context.author).then(function () {
                    done(new Error('Author should not be able to add an Author'));
                }).catch(checkForErrorType('NoPermissionError', done));
            });
        });
    });
});
