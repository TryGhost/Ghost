var testUtils = require('../../utils'),
    should = require('should'),
    sinon = require('sinon'),
    _ = require('lodash'),
    Promise = require('bluebird'),
    InvitesAPI = require('../../../server/api/invites'),
    mail = require('../../../server/api/mail'),
    errors = require('../../../server/errors'),
    context = testUtils.context,
    sandbox = sinon.sandbox.create();

describe('Invites API', function () {
    beforeEach(testUtils.teardown);
    beforeEach(testUtils.setup('invites', 'users:roles', 'perms:invite', 'perms:init'));

    beforeEach(function () {
        sandbox.stub(mail, 'send', function () {
            return Promise.resolve();
        });
    });

    afterEach(function () {
        sandbox.restore();
    });

    after(testUtils.teardown);

    describe('CRUD', function () {
        describe('Add', function () {
            it('add invite 1', function () {
                return InvitesAPI.add({
                    invites: [{email: 'test@example.com', roles: [testUtils.roles.ids.editor]}]
                }, _.merge({}, {include: ['roles']}, testUtils.context.owner)).then(function (response) {
                    response.invites.length.should.eql(1);
                    response.invites[0].roles.length.should.eql(1);
                    response.invites[0].roles[0].name.should.eql('Editor');
                });
            });

            it('add invite 2', function () {
                return InvitesAPI.add({
                    invites: [{email: 'test2@example.com', roles: [testUtils.roles.ids.author]}]
                }, _.merge({}, {include: ['roles']}, testUtils.context.owner)).then(function (response) {
                    response.invites.length.should.eql(1);
                    response.invites[0].roles.length.should.eql(1);
                    response.invites[0].roles[0].name.should.eql('Author');
                });
            });

            it('add invite: empty invites object', function () {
                return InvitesAPI.add({invites: []}, _.merge({}, {include: ['roles']}, testUtils.context.owner))
                    .then(function () {
                        throw new Error('expected validation error');
                    }).catch(function (err) {
                        should.exist(err);
                    });
            });

            it('add invite: no email provided', function () {
                return InvitesAPI.add({invites: [{status: 'sent'}]}, _.merge({}, {include: ['roles']}, testUtils.context.owner))
                    .then(function () {
                        throw new Error('expected validation error');
                    }).catch(function (err) {
                        (err instanceof errors.ValidationError).should.eql(true);
                    });
            });
        });

        describe('Browse', function () {
            it('browse invites', function () {
                return InvitesAPI.browse(_.merge({}, {include: ['roles']}, testUtils.context.owner))
                    .then(function (response) {
                        response.invites.length.should.eql(2);

                        response.invites[0].status.should.eql('sent');
                        response.invites[0].email.should.eql('test1@ghost.org');
                        response.invites[0].roles.length.should.eql(1);
                        response.invites[0].roles[0].name.should.eql('Administrator');

                        response.invites[1].status.should.eql('sent');
                        response.invites[1].email.should.eql('test2@ghost.org');
                        response.invites[1].roles.length.should.eql(1);
                        response.invites[1].roles[0].name.should.eql('Author');

                        should.not.exist(response.invites[0].token);
                        should.exist(response.invites[0].expires);

                        should.not.exist(response.invites[1].token);
                        should.exist(response.invites[1].expires);
                    });
            });
        });

        describe('Read', function () {
            it('read invites: not found', function () {
                return InvitesAPI.read(_.merge({}, testUtils.context.owner, {
                    email: 'not-existend@hey.org',
                    include: ['roles']
                })).then(function () {
                    throw new Error('expected not found error for invite');
                }).catch(function (err) {
                    (err instanceof errors.NotFoundError).should.eql(true);
                });
            });

            it('read invite', function () {
                return InvitesAPI.read(_.merge({}, {email: 'test1@ghost.org', include: ['roles']}, testUtils.context.owner))
                    .then(function (response) {
                        response.invites.length.should.eql(1);
                        response.invites[0].roles.length.should.eql(1);
                        response.invites[0].roles[0].name.should.eql('Administrator');
                    });
            });

            it('read invite', function () {
                return InvitesAPI.read(_.merge({}, testUtils.context.owner, {email: 'test2@ghost.org', include: ['roles']}))
                    .then(function (response) {
                        response.invites.length.should.eql(1);
                        response.invites[0].roles.length.should.eql(1);
                        response.invites[0].roles[0].name.should.eql('Author');
                    });
            });
        });

        describe('Destroy', function () {
            it('destroy invite', function () {
                return InvitesAPI.destroy(_.merge({}, testUtils.context.owner, {id: 1, include: ['roles']}))
                    .then(function () {
                        return InvitesAPI.read(_.merge({}, testUtils.context.owner, {
                            email: 'test1@ghost.org',
                            include: ['roles']
                        })).catch(function (err) {
                            (err instanceof errors.NotFoundError).should.eql(true);
                        });
                    });
            });

            it('destroy invite: id does not exist', function () {
                return InvitesAPI.destroy({context: {user: 1}, id: 100})
                    .then(function () {
                        throw new Error('expect error on destroy invite');
                    })
                    .catch(function (err) {
                        (err instanceof errors.NotFoundError).should.eql(true);
                    });
            });
        });
    });

    describe('Permissions', function () {
        function checkForErrorType(type) {
            return function checkForErrorType(error) {
                if (error.errorType) {
                    error.errorType.should.eql(type);
                }
            };
        }

        function checkAddResponse(response) {
            should.exist(response);
            should.exist(response.invites);
            should.not.exist(response.meta);

            response.invites.should.have.length(1);
            testUtils.API.checkResponse(response.invites[0], 'invites', ['roles']);
            response.invites[0].created_at.should.be.an.instanceof(Date);
        }

        describe('Owner', function () {
            it('CANNOT add an Owner', function () {
                return InvitesAPI.add({
                    invites: [
                        {
                            email: 'test@example.com',
                            roles: [testUtils.roles.ids.owner]
                        }
                    ]
                }, context.owner).then(function () {
                    throw new Error('Owner should not be able to add an owner');
                }).catch(checkForErrorType('NoPermissionError'));
            });

            it('Can add an Admin', function () {
                return InvitesAPI.add({
                    invites: [
                        {
                            email: 'test@example.com',
                            roles: [testUtils.roles.ids.admin]
                        }
                    ]
                }, _.merge({}, {include: ['roles']}, testUtils.context.owner)).then(function (response) {
                    checkAddResponse(response);
                    response.invites[0].roles[0].name.should.equal('Administrator');
                });
            });

            it('Can add an Editor', function () {
                return InvitesAPI.add({
                    invites: [
                        {
                            email: 'test@example.com',
                            roles: [testUtils.roles.ids.editor]
                        }
                    ]
                }, _.merge({}, {include: ['roles']}, testUtils.context.owner)).then(function (response) {
                    checkAddResponse(response);
                    response.invites[0].roles[0].name.should.equal('Editor');
                });
            });

            it('Can add an Author', function () {
                return InvitesAPI.add({
                    invites: [
                        {
                            email: 'test@example.com',
                            roles: [testUtils.roles.ids.author]
                        }
                    ]
                }, _.merge({}, {include: ['roles']}, testUtils.context.owner)).then(function (response) {
                    checkAddResponse(response);
                    response.invites[0].roles[0].name.should.equal('Author');
                });
            });

            it('Can add with role set as string', function () {
                return InvitesAPI.add({
                    invites: [
                        {
                            email: 'test@example.com',
                            roles: [testUtils.roles.ids.author.toString()]
                        }
                    ]
                }, _.merge({}, {include: ['roles']}, testUtils.context.owner)).then(function (response) {
                    checkAddResponse(response);
                    response.invites[0].roles[0].name.should.equal('Author');
                });
            });
        });

        describe('Admin', function () {
            it('CANNOT add an Owner', function () {
                return InvitesAPI.add({
                    invites: [
                        {
                            email: 'test@example.com',
                            roles: [testUtils.roles.ids.owner]
                        }
                    ]
                }, _.merge({}, {include: ['roles']}, testUtils.context.admin)).then(function () {
                    throw new Error('Admin should not be able to add an owner');
                }).catch(checkForErrorType('NoPermissionError'));
            });

            it('Can add an Admin', function () {
                return InvitesAPI.add({
                    invites: [
                        {
                            email: 'test@example.com',
                            roles: [testUtils.roles.ids.admin]
                        }
                    ]
                }, _.merge({}, {include: ['roles']}, testUtils.context.admin)).then(function (response) {
                    checkAddResponse(response);
                    response.invites[0].roles[0].name.should.equal('Administrator');
                });
            });

            it('Can add an Editor', function () {
                return InvitesAPI.add({
                    invites: [
                        {
                            email: 'test@example.com',
                            roles: [testUtils.roles.ids.editor]
                        }
                    ]
                }, _.merge({}, {include: ['roles']}, testUtils.context.admin)).then(function (response) {
                    checkAddResponse(response);
                    response.invites[0].roles[0].name.should.equal('Editor');
                });
            });

            it('Can add an Author', function () {
                return InvitesAPI.add({
                    invites: [
                        {
                            email: 'test@example.com',
                            roles: [testUtils.roles.ids.author]
                        }
                    ]
                }, _.merge({}, {include: ['roles']}, testUtils.context.admin)).then(function (response) {
                    checkAddResponse(response);
                    response.invites[0].roles[0].name.should.equal('Author');
                });
            });
        });

        describe('Editor', function () {
            it('CANNOT add an Owner', function () {
                return InvitesAPI.add({
                    invites: [
                        {
                            email: 'test@example.com',
                            roles: [testUtils.roles.ids.owner]
                        }
                    ]
                }, context.editor).then(function () {
                    throw new Error('Editor should not be able to add an owner');
                }).catch(checkForErrorType('NoPermissionError'));
            });

            it('CANNOT add an Author', function () {
                return InvitesAPI.add({
                    invites: [
                        {
                            email: 'test@example.com',
                            roles: [testUtils.roles.ids.author]
                        }
                    ]
                }, context.editor).then(function () {
                    throw new Error('Editor should not be able to add an author');
                }).catch(checkForErrorType('NoPermissionError'));
            });
        });

        describe('Author', function () {
            it('CANNOT add an Owner', function () {
                return InvitesAPI.add({
                    invites: [
                        {
                            email: 'test@example.com',
                            roles: [testUtils.roles.ids.owner]
                        }
                    ]
                }, context.author).then(function () {
                    throw new Error('Author should not be able to add an owner');
                }).catch(checkForErrorType('NoPermissionError'));
            });

            it('CANNOT add an Author', function () {
                return InvitesAPI.add({
                    invites: [
                        {
                            email: 'test@example.com',
                            roles: [testUtils.roles.ids.author]
                        }
                    ]
                }, context.author).then(function () {
                    throw new Error('Author should not be able to add an Author');
                }).catch(checkForErrorType('NoPermissionError'));
            });
        });
    });
});
