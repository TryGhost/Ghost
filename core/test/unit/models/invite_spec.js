const should = require('should'),
    sinon = require('sinon'),
    Promise = require('bluebird'),
    common = require('../../../server/lib/common'),
    models = require('../../../server/models'),
    settingsCache = require('../../../server/services/settings/cache'),
    testUtils = require('../../utils'),
    sandbox = sinon.sandbox.create();

describe('Unit: models/invite', function () {
    before(function () {
        models.init();
    });

    beforeEach(function () {
        sandbox.stub(settingsCache, 'get').withArgs('db_hash').returns('12345678');
    });

    afterEach(function () {
        sandbox.restore();
    });

    before(testUtils.teardown);

    describe('add', function () {
        beforeEach(testUtils.setup('roles'));
        afterEach(testUtils.teardown);

        it('default', function () {
            return models.Invite.add({email: 'invited@test.org', role_id: testUtils.DataGenerator.forKnex.roles[1].id})
                .then(function (invite) {
                    invite.get('status').should.eql('pending');
                    invite.get('email').should.eql('invited@test.org');
                    should.exist(invite.get('token'));
                    should.exist(invite.get('expires'));
                });
        });

        it('set status with none internal context', function () {
            return models.Invite.add({
                email: 'invited@test.org',
                role_id: testUtils.DataGenerator.forKnex.roles[1].id,
                status: 'sent'
            }).then(function (invite) {
                invite.get('status').should.eql('pending');
                invite.get('email').should.eql('invited@test.org');
                should.exist(invite.get('token'));
                should.exist(invite.get('expires'));
            });
        });

        it('set status with internal context', function () {
            return models.Invite.add({
                email: 'invited@test.org',
                role_id: testUtils.DataGenerator.forKnex.roles[1].id,
                status: 'sent'
            }, testUtils.context.internal).then(function (invite) {
                invite.get('status').should.eql('sent');
                invite.get('email').should.eql('invited@test.org');
                should.exist(invite.get('token'));
                should.exist(invite.get('expires'));
            });
        });

        it('[error] no role passed', function () {
            return models.Invite.add({email: 'invited@test.org'})
                .then(function () {
                    'Should fail'.should.be.true();
                })
                .catch(function (err) {
                    (err[0] instanceof common.errors.ValidationError).should.be.true();
                });
        });
    });

    describe('permissible', function () {
        describe('action: add', function () {
            let inviteModel;
            let context;
            let unsafeAttrs;
            let roleModel;
            let loadedPermissions;

            before(function () {
                inviteModel = {};
                context = {};
                unsafeAttrs = {role_id: 'role_id'};
                roleModel = sandbox.stub();
                roleModel.get = sandbox.stub();
                loadedPermissions = {
                    user: {
                        roles: []
                    }
                };
            });

            it('role does not exist', function () {
                sandbox.stub(models.Role, 'findOne').withArgs({id: 'role_id'}).resolves(null);

                return models.Invite.permissible(inviteModel, 'add', context, unsafeAttrs)
                    .then(Promise.reject)
                    .catch((err) => {
                        (err instanceof common.errors.NotFoundError).should.eql(true);
                    });
            });

            it('invite owner', function () {
                sandbox.stub(models.Role, 'findOne').withArgs({id: 'role_id'}).resolves(roleModel);
                roleModel.get.withArgs('name').returns('Owner');

                return models.Invite.permissible(inviteModel, 'add', context, unsafeAttrs)
                    .then(Promise.reject)
                    .catch((err) => {
                        (err instanceof common.errors.NoPermissionError).should.eql(true);
                    });
            });

            describe('as owner', function () {
                beforeEach(function () {
                    loadedPermissions.user.roles = [{name: 'Owner'}];
                });

                it('invite administrator', function () {
                    sandbox.stub(models.Role, 'findOne').withArgs({id: 'role_id'}).resolves(roleModel);
                    roleModel.get.withArgs('name').returns('Administrator');

                    return models.Invite.permissible(inviteModel, 'add', context, unsafeAttrs, loadedPermissions, true, true);
                });

                it('invite editor', function () {
                    sandbox.stub(models.Role, 'findOne').withArgs({id: 'role_id'}).resolves(roleModel);
                    roleModel.get.withArgs('name').returns('Editor');

                    return models.Invite.permissible(inviteModel, 'add', context, unsafeAttrs, loadedPermissions, true, true);
                });

                it('invite author', function () {
                    sandbox.stub(models.Role, 'findOne').withArgs({id: 'role_id'}).resolves(roleModel);
                    roleModel.get.withArgs('name').returns('Author');

                    return models.Invite.permissible(inviteModel, 'add', context, unsafeAttrs, loadedPermissions, true, true);
                });

                it('invite contributor', function () {
                    sandbox.stub(models.Role, 'findOne').withArgs({id: 'role_id'}).resolves(roleModel);
                    roleModel.get.withArgs('name').returns('Contributor');

                    return models.Invite.permissible(inviteModel, 'add', context, unsafeAttrs, loadedPermissions, true, true);
                });
            });

            describe('as administrator', function () {
                beforeEach(function () {
                    loadedPermissions.user.roles = [{name: 'Administrator'}];
                });

                it('invite administrator', function () {
                    sandbox.stub(models.Role, 'findOne').withArgs({id: 'role_id'}).resolves(roleModel);
                    roleModel.get.withArgs('name').returns('Administrator');

                    return models.Invite.permissible(inviteModel, 'add', context, unsafeAttrs, loadedPermissions, true, true);
                });

                it('invite editor', function () {
                    sandbox.stub(models.Role, 'findOne').withArgs({id: 'role_id'}).resolves(roleModel);
                    roleModel.get.withArgs('name').returns('Editor');

                    return models.Invite.permissible(inviteModel, 'add', context, unsafeAttrs, loadedPermissions, true, true);
                });

                it('invite author', function () {
                    sandbox.stub(models.Role, 'findOne').withArgs({id: 'role_id'}).resolves(roleModel);
                    roleModel.get.withArgs('name').returns('Author');

                    return models.Invite.permissible(inviteModel, 'add', context, unsafeAttrs, loadedPermissions, true, true);
                });

                it('invite contributor', function () {
                    sandbox.stub(models.Role, 'findOne').withArgs({id: 'role_id'}).resolves(roleModel);
                    roleModel.get.withArgs('name').returns('Contributor');

                    return models.Invite.permissible(inviteModel, 'add', context, unsafeAttrs, loadedPermissions, true, true);
                });
            });

            describe('as editor', function () {
                beforeEach(function () {
                    loadedPermissions.user.roles = [{name: 'Editor'}];
                });

                it('invite administrator', function () {
                    sandbox.stub(models.Role, 'findOne').withArgs({id: 'role_id'}).resolves(roleModel);
                    roleModel.get.withArgs('name').returns('Administrator');

                    return models.Invite.permissible(inviteModel, 'add', context, unsafeAttrs, loadedPermissions, true, true)
                        .then(Promise.reject)
                        .catch((err) => {
                            (err instanceof common.errors.NoPermissionError).should.eql(true);
                        });
                });

                it('invite editor', function () {
                    sandbox.stub(models.Role, 'findOne').withArgs({id: 'role_id'}).resolves(roleModel);
                    roleModel.get.withArgs('name').returns('Editor');

                    return models.Invite.permissible(inviteModel, 'add', context, unsafeAttrs, loadedPermissions, true, true)
                        .then(Promise.reject)
                        .catch((err) => {
                            (err instanceof common.errors.NoPermissionError).should.eql(true);
                        });
                });

                it('invite author', function () {
                    sandbox.stub(models.Role, 'findOne').withArgs({id: 'role_id'}).resolves(roleModel);
                    roleModel.get.withArgs('name').returns('Author');

                    return models.Invite.permissible(inviteModel, 'add', context, unsafeAttrs, loadedPermissions, true, true);
                });

                it('invite contributor', function () {
                    sandbox.stub(models.Role, 'findOne').withArgs({id: 'role_id'}).resolves(roleModel);
                    roleModel.get.withArgs('name').returns('Contributor');

                    return models.Invite.permissible(inviteModel, 'add', context, unsafeAttrs, loadedPermissions, true, true);
                });
            });

            describe('as author', function () {
                beforeEach(function () {
                    loadedPermissions.user.roles = [{name: 'Author'}];
                });

                it('invite administrator', function () {
                    sandbox.stub(models.Role, 'findOne').withArgs({id: 'role_id'}).resolves(roleModel);
                    roleModel.get.withArgs('name').returns('Administrator');

                    return models.Invite.permissible(inviteModel, 'add', context, unsafeAttrs, loadedPermissions, false, false)
                        .then(Promise.reject)
                        .catch((err) => {
                            (err instanceof common.errors.NoPermissionError).should.eql(true);
                        });
                });

                it('invite editor', function () {
                    sandbox.stub(models.Role, 'findOne').withArgs({id: 'role_id'}).resolves(roleModel);
                    roleModel.get.withArgs('name').returns('Editor');

                    return models.Invite.permissible(inviteModel, 'add', context, unsafeAttrs, loadedPermissions, false, false)
                        .then(Promise.reject)
                        .catch((err) => {
                            (err instanceof common.errors.NoPermissionError).should.eql(true);
                        });
                });

                it('invite author', function () {
                    sandbox.stub(models.Role, 'findOne').withArgs({id: 'role_id'}).resolves(roleModel);
                    roleModel.get.withArgs('name').returns('Author');

                    return models.Invite.permissible(inviteModel, 'add', context, unsafeAttrs, loadedPermissions, false, false)
                        .then(Promise.reject)
                        .catch((err) => {
                            (err instanceof common.errors.NoPermissionError).should.eql(true);
                        });
                });

                it('invite contributor', function () {
                    sandbox.stub(models.Role, 'findOne').withArgs({id: 'role_id'}).resolves(roleModel);
                    roleModel.get.withArgs('name').returns('Contributor');

                    return models.Invite.permissible(inviteModel, 'add', context, unsafeAttrs, loadedPermissions, false, false)
                        .then(Promise.reject)
                        .catch((err) => {
                            (err instanceof common.errors.NoPermissionError).should.eql(true);
                        });
                });
            });

            describe('as contributor', function () {
                beforeEach(function () {
                    loadedPermissions.user.roles = [{name: 'Contributor'}];
                });

                it('invite administrator', function () {
                    sandbox.stub(models.Role, 'findOne').withArgs({id: 'role_id'}).resolves(roleModel);
                    roleModel.get.withArgs('name').returns('Administrator');

                    return models.Invite.permissible(inviteModel, 'add', context, unsafeAttrs, loadedPermissions, false, false)
                        .then(Promise.reject)
                        .catch((err) => {
                            (err instanceof common.errors.NoPermissionError).should.eql(true);
                        });
                });

                it('invite editor', function () {
                    sandbox.stub(models.Role, 'findOne').withArgs({id: 'role_id'}).resolves(roleModel);
                    roleModel.get.withArgs('name').returns('Editor');

                    return models.Invite.permissible(inviteModel, 'add', context, unsafeAttrs, loadedPermissions, false, false)
                        .then(Promise.reject)
                        .catch((err) => {
                            (err instanceof common.errors.NoPermissionError).should.eql(true);
                        });
                });

                it('invite author', function () {
                    sandbox.stub(models.Role, 'findOne').withArgs({id: 'role_id'}).resolves(roleModel);
                    roleModel.get.withArgs('name').returns('Author');

                    return models.Invite.permissible(inviteModel, 'add', context, unsafeAttrs, loadedPermissions, false, false)
                        .then(Promise.reject)
                        .catch((err) => {
                            (err instanceof common.errors.NoPermissionError).should.eql(true);
                        });
                });

                it('invite contributor', function () {
                    sandbox.stub(models.Role, 'findOne').withArgs({id: 'role_id'}).resolves(roleModel);
                    roleModel.get.withArgs('name').returns('Contributor');

                    return models.Invite.permissible(inviteModel, 'add', context, unsafeAttrs, loadedPermissions, false, false)
                        .then(Promise.reject)
                        .catch((err) => {
                            (err instanceof common.errors.NoPermissionError).should.eql(true);
                        });
                });
            });
        });
    });
});
