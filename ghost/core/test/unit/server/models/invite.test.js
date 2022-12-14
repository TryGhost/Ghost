const errors = require('@tryghost/errors');
const sinon = require('sinon');
const Promise = require('bluebird');
const models = require('../../../../core/server/models');
const settingsCache = require('../../../../core/shared/settings-cache');

describe('Unit: models/invite', function () {
    before(function () {
        models.init();
    });

    beforeEach(function () {
        sinon.stub(settingsCache, 'get').withArgs('db_hash').returns('12345678');
    });

    afterEach(function () {
        sinon.restore();
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
                roleModel = sinon.stub();
                roleModel.get = sinon.stub();
                loadedPermissions = {
                    user: {
                        roles: []
                    }
                };
            });

            it('role does not exist', function () {
                sinon.stub(models.Role, 'findOne').withArgs({id: 'role_id'}).resolves(null);

                return models.Invite.permissible(inviteModel, 'add', context, unsafeAttrs)
                    .then(Promise.reject)
                    .catch((err) => {
                        (err instanceof errors.NotFoundError).should.eql(true);
                    });
            });

            it('invite owner', function () {
                sinon.stub(models.Role, 'findOne').withArgs({id: 'role_id'}).resolves(roleModel);
                roleModel.get.withArgs('name').returns('Owner');

                return models.Invite.permissible(inviteModel, 'add', context, unsafeAttrs)
                    .then(Promise.reject)
                    .catch((err) => {
                        (err instanceof errors.NoPermissionError).should.eql(true);
                    });
            });

            describe('as owner', function () {
                beforeEach(function () {
                    loadedPermissions.user.roles = [{name: 'Owner'}];
                });

                it('invite administrator', function () {
                    sinon.stub(models.Role, 'findOne').withArgs({id: 'role_id'}).resolves(roleModel);
                    roleModel.get.withArgs('name').returns('Administrator');

                    return models.Invite.permissible(inviteModel, 'add', context, unsafeAttrs, loadedPermissions, true, true, true);
                });

                it('invite editor', function () {
                    sinon.stub(models.Role, 'findOne').withArgs({id: 'role_id'}).resolves(roleModel);
                    roleModel.get.withArgs('name').returns('Editor');

                    return models.Invite.permissible(inviteModel, 'add', context, unsafeAttrs, loadedPermissions, true, true, true);
                });

                it('invite author', function () {
                    sinon.stub(models.Role, 'findOne').withArgs({id: 'role_id'}).resolves(roleModel);
                    roleModel.get.withArgs('name').returns('Author');

                    return models.Invite.permissible(inviteModel, 'add', context, unsafeAttrs, loadedPermissions, true, true, true);
                });

                it('invite contributor', function () {
                    sinon.stub(models.Role, 'findOne').withArgs({id: 'role_id'}).resolves(roleModel);
                    roleModel.get.withArgs('name').returns('Contributor');

                    return models.Invite.permissible(inviteModel, 'add', context, unsafeAttrs, loadedPermissions, true, true, true);
                });
            });

            describe('as administrator', function () {
                beforeEach(function () {
                    loadedPermissions.user.roles = [{name: 'Administrator'}];
                });

                it('invite administrator', function () {
                    sinon.stub(models.Role, 'findOne').withArgs({id: 'role_id'}).resolves(roleModel);
                    roleModel.get.withArgs('name').returns('Administrator');

                    return models.Invite.permissible(inviteModel, 'add', context, unsafeAttrs, loadedPermissions, true, true, true);
                });

                it('invite editor', function () {
                    sinon.stub(models.Role, 'findOne').withArgs({id: 'role_id'}).resolves(roleModel);
                    roleModel.get.withArgs('name').returns('Editor');

                    return models.Invite.permissible(inviteModel, 'add', context, unsafeAttrs, loadedPermissions, true, true, true);
                });

                it('invite author', function () {
                    sinon.stub(models.Role, 'findOne').withArgs({id: 'role_id'}).resolves(roleModel);
                    roleModel.get.withArgs('name').returns('Author');

                    return models.Invite.permissible(inviteModel, 'add', context, unsafeAttrs, loadedPermissions, true, true, true);
                });

                it('invite contributor', function () {
                    sinon.stub(models.Role, 'findOne').withArgs({id: 'role_id'}).resolves(roleModel);
                    roleModel.get.withArgs('name').returns('Contributor');

                    return models.Invite.permissible(inviteModel, 'add', context, unsafeAttrs, loadedPermissions, true, true, true);
                });
            });

            describe('as editor', function () {
                beforeEach(function () {
                    loadedPermissions.user.roles = [{name: 'Editor'}];
                });

                it('invite administrator', function () {
                    sinon.stub(models.Role, 'findOne').withArgs({id: 'role_id'}).resolves(roleModel);
                    roleModel.get.withArgs('name').returns('Administrator');

                    return models.Invite.permissible(inviteModel, 'add', context, unsafeAttrs, loadedPermissions, true, true, true)
                        .then(Promise.reject)
                        .catch((err) => {
                            (err instanceof errors.NoPermissionError).should.eql(true);
                        });
                });

                it('invite editor', function () {
                    sinon.stub(models.Role, 'findOne').withArgs({id: 'role_id'}).resolves(roleModel);
                    roleModel.get.withArgs('name').returns('Editor');

                    return models.Invite.permissible(inviteModel, 'add', context, unsafeAttrs, loadedPermissions, true, true, true)
                        .then(Promise.reject)
                        .catch((err) => {
                            (err instanceof errors.NoPermissionError).should.eql(true);
                        });
                });

                it('invite author', function () {
                    sinon.stub(models.Role, 'findOne').withArgs({id: 'role_id'}).resolves(roleModel);
                    roleModel.get.withArgs('name').returns('Author');

                    return models.Invite.permissible(inviteModel, 'add', context, unsafeAttrs, loadedPermissions, true, true, true);
                });

                it('invite contributor', function () {
                    sinon.stub(models.Role, 'findOne').withArgs({id: 'role_id'}).resolves(roleModel);
                    roleModel.get.withArgs('name').returns('Contributor');

                    return models.Invite.permissible(inviteModel, 'add', context, unsafeAttrs, loadedPermissions, true, true, true);
                });
            });

            describe('as author', function () {
                beforeEach(function () {
                    loadedPermissions.user.roles = [{name: 'Author'}];
                });

                it('invite administrator', function () {
                    sinon.stub(models.Role, 'findOne').withArgs({id: 'role_id'}).resolves(roleModel);
                    roleModel.get.withArgs('name').returns('Administrator');

                    return models.Invite.permissible(inviteModel, 'add', context, unsafeAttrs, loadedPermissions, false, false, true)
                        .then(Promise.reject)
                        .catch((err) => {
                            (err instanceof errors.NoPermissionError).should.eql(true);
                        });
                });

                it('invite editor', function () {
                    sinon.stub(models.Role, 'findOne').withArgs({id: 'role_id'}).resolves(roleModel);
                    roleModel.get.withArgs('name').returns('Editor');

                    return models.Invite.permissible(inviteModel, 'add', context, unsafeAttrs, loadedPermissions, false, false, true)
                        .then(Promise.reject)
                        .catch((err) => {
                            (err instanceof errors.NoPermissionError).should.eql(true);
                        });
                });

                it('invite author', function () {
                    sinon.stub(models.Role, 'findOne').withArgs({id: 'role_id'}).resolves(roleModel);
                    roleModel.get.withArgs('name').returns('Author');

                    return models.Invite.permissible(inviteModel, 'add', context, unsafeAttrs, loadedPermissions, false, false, true)
                        .then(Promise.reject)
                        .catch((err) => {
                            (err instanceof errors.NoPermissionError).should.eql(true);
                        });
                });

                it('invite contributor', function () {
                    sinon.stub(models.Role, 'findOne').withArgs({id: 'role_id'}).resolves(roleModel);
                    roleModel.get.withArgs('name').returns('Contributor');

                    return models.Invite.permissible(inviteModel, 'add', context, unsafeAttrs, loadedPermissions, false, false, true)
                        .then(Promise.reject)
                        .catch((err) => {
                            (err instanceof errors.NoPermissionError).should.eql(true);
                        });
                });
            });

            describe('as contributor', function () {
                beforeEach(function () {
                    loadedPermissions.user.roles = [{name: 'Contributor'}];
                });

                it('invite administrator', function () {
                    sinon.stub(models.Role, 'findOne').withArgs({id: 'role_id'}).resolves(roleModel);
                    roleModel.get.withArgs('name').returns('Administrator');

                    return models.Invite.permissible(inviteModel, 'add', context, unsafeAttrs, loadedPermissions, false, false, true)
                        .then(Promise.reject)
                        .catch((err) => {
                            (err instanceof errors.NoPermissionError).should.eql(true);
                        });
                });

                it('invite editor', function () {
                    sinon.stub(models.Role, 'findOne').withArgs({id: 'role_id'}).resolves(roleModel);
                    roleModel.get.withArgs('name').returns('Editor');

                    return models.Invite.permissible(inviteModel, 'add', context, unsafeAttrs, loadedPermissions, false, false, true)
                        .then(Promise.reject)
                        .catch((err) => {
                            (err instanceof errors.NoPermissionError).should.eql(true);
                        });
                });

                it('invite author', function () {
                    sinon.stub(models.Role, 'findOne').withArgs({id: 'role_id'}).resolves(roleModel);
                    roleModel.get.withArgs('name').returns('Author');

                    return models.Invite.permissible(inviteModel, 'add', context, unsafeAttrs, loadedPermissions, false, false, true)
                        .then(Promise.reject)
                        .catch((err) => {
                            (err instanceof errors.NoPermissionError).should.eql(true);
                        });
                });

                it('invite contributor', function () {
                    sinon.stub(models.Role, 'findOne').withArgs({id: 'role_id'}).resolves(roleModel);
                    roleModel.get.withArgs('name').returns('Contributor');

                    return models.Invite.permissible(inviteModel, 'add', context, unsafeAttrs, loadedPermissions, false, false, true)
                        .then(Promise.reject)
                        .catch((err) => {
                            (err instanceof errors.NoPermissionError).should.eql(true);
                        });
                });
            });
        });
    });
});
