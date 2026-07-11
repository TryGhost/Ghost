const assert = require('node:assert/strict');
const errors = require('@tryghost/errors');
const sinon = require('sinon');
const {Invite} = require('../../../../core/server/models/invite');
const {Role} = require('../../../../core/server/models/role');
const settingsCache = require('../../../../core/shared/settings-cache');

describe('Unit: models/invite', function () {
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

            beforeAll(function () {
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
                sinon.stub(Role, 'findOne').withArgs({id: 'role_id'}).resolves(null);

                return Invite.permissible(inviteModel, 'add', context, unsafeAttrs)
                    .then(Promise.reject)
                    .catch((err) => {
                        assert.equal(err instanceof errors.NotFoundError, true);
                    });
            });

            it('invite owner', function () {
                sinon.stub(Role, 'findOne').withArgs({id: 'role_id'}).resolves(roleModel);
                roleModel.get.withArgs('name').returns('Owner');

                return Invite.permissible(inviteModel, 'add', context, unsafeAttrs)
                    .then(Promise.reject)
                    .catch((err) => {
                        assert.equal(err instanceof errors.NoPermissionError, true);
                    });
            });

            describe('as owner', function () {
                beforeEach(function () {
                    loadedPermissions.user.roles = [{name: 'Owner'}];
                });

                it('invite administrator', function () {
                    sinon.stub(Role, 'findOne').withArgs({id: 'role_id'}).resolves(roleModel);
                    roleModel.get.withArgs('name').returns('Administrator');

                    return Invite.permissible(inviteModel, 'add', context, unsafeAttrs, loadedPermissions, true, true, true);
                });

                it('invite editor', function () {
                    sinon.stub(Role, 'findOne').withArgs({id: 'role_id'}).resolves(roleModel);
                    roleModel.get.withArgs('name').returns('Editor');

                    return Invite.permissible(inviteModel, 'add', context, unsafeAttrs, loadedPermissions, true, true, true);
                });

                it('invite author', function () {
                    sinon.stub(Role, 'findOne').withArgs({id: 'role_id'}).resolves(roleModel);
                    roleModel.get.withArgs('name').returns('Author');

                    return Invite.permissible(inviteModel, 'add', context, unsafeAttrs, loadedPermissions, true, true, true);
                });

                it('invite contributor', function () {
                    sinon.stub(Role, 'findOne').withArgs({id: 'role_id'}).resolves(roleModel);
                    roleModel.get.withArgs('name').returns('Contributor');

                    return Invite.permissible(inviteModel, 'add', context, unsafeAttrs, loadedPermissions, true, true, true);
                });
            });

            describe('as administrator', function () {
                beforeEach(function () {
                    loadedPermissions.user.roles = [{name: 'Administrator'}];
                });

                it('invite administrator', function () {
                    sinon.stub(Role, 'findOne').withArgs({id: 'role_id'}).resolves(roleModel);
                    roleModel.get.withArgs('name').returns('Administrator');

                    return Invite.permissible(inviteModel, 'add', context, unsafeAttrs, loadedPermissions, true, true, true);
                });

                it('invite editor', function () {
                    sinon.stub(Role, 'findOne').withArgs({id: 'role_id'}).resolves(roleModel);
                    roleModel.get.withArgs('name').returns('Editor');

                    return Invite.permissible(inviteModel, 'add', context, unsafeAttrs, loadedPermissions, true, true, true);
                });

                it('invite author', function () {
                    sinon.stub(Role, 'findOne').withArgs({id: 'role_id'}).resolves(roleModel);
                    roleModel.get.withArgs('name').returns('Author');

                    return Invite.permissible(inviteModel, 'add', context, unsafeAttrs, loadedPermissions, true, true, true);
                });

                it('invite contributor', function () {
                    sinon.stub(Role, 'findOne').withArgs({id: 'role_id'}).resolves(roleModel);
                    roleModel.get.withArgs('name').returns('Contributor');

                    return Invite.permissible(inviteModel, 'add', context, unsafeAttrs, loadedPermissions, true, true, true);
                });
            });

            describe('as editor', function () {
                beforeEach(function () {
                    loadedPermissions.user.roles = [{name: 'Editor'}];
                });

                it('invite administrator', function () {
                    sinon.stub(Role, 'findOne').withArgs({id: 'role_id'}).resolves(roleModel);
                    roleModel.get.withArgs('name').returns('Administrator');

                    return Invite.permissible(inviteModel, 'add', context, unsafeAttrs, loadedPermissions, true, true, true)
                        .then(Promise.reject)
                        .catch((err) => {
                            assert.equal(err instanceof errors.NoPermissionError, true);
                        });
                });

                it('invite editor', function () {
                    sinon.stub(Role, 'findOne').withArgs({id: 'role_id'}).resolves(roleModel);
                    roleModel.get.withArgs('name').returns('Editor');

                    return Invite.permissible(inviteModel, 'add', context, unsafeAttrs, loadedPermissions, true, true, true)
                        .then(Promise.reject)
                        .catch((err) => {
                            assert.equal(err instanceof errors.NoPermissionError, true);
                        });
                });

                it('invite editor with staff token', function () {
                    loadedPermissions.apiKey = {
                        roles: [{name: 'Admin Integration'}]
                    };
                    sinon.stub(Role, 'findOne').withArgs({id: 'role_id'}).resolves(roleModel);
                    roleModel.get.withArgs('name').returns('Editor');

                    return Invite.permissible(inviteModel, 'add', context, unsafeAttrs, loadedPermissions, true, true, true)
                        .then(Promise.reject)
                        .catch((err) => {
                            assert.equal(err instanceof errors.NoPermissionError, true);
                            delete loadedPermissions.apiKey;
                        });
                });

                it('invite author', function () {
                    sinon.stub(Role, 'findOne').withArgs({id: 'role_id'}).resolves(roleModel);
                    roleModel.get.withArgs('name').returns('Author');

                    return Invite.permissible(inviteModel, 'add', context, unsafeAttrs, loadedPermissions, true, true, true);
                });

                it('invite contributor', function () {
                    sinon.stub(Role, 'findOne').withArgs({id: 'role_id'}).resolves(roleModel);
                    roleModel.get.withArgs('name').returns('Contributor');

                    return Invite.permissible(inviteModel, 'add', context, unsafeAttrs, loadedPermissions, true, true, true);
                });
            });

            describe('as author', function () {
                beforeEach(function () {
                    loadedPermissions.user.roles = [{name: 'Author'}];
                });

                it('invite administrator', function () {
                    sinon.stub(Role, 'findOne').withArgs({id: 'role_id'}).resolves(roleModel);
                    roleModel.get.withArgs('name').returns('Administrator');

                    return Invite.permissible(inviteModel, 'add', context, unsafeAttrs, loadedPermissions, false, false, true)
                        .then(Promise.reject)
                        .catch((err) => {
                            assert.equal(err instanceof errors.NoPermissionError, true);
                        });
                });

                it('invite editor', function () {
                    sinon.stub(Role, 'findOne').withArgs({id: 'role_id'}).resolves(roleModel);
                    roleModel.get.withArgs('name').returns('Editor');

                    return Invite.permissible(inviteModel, 'add', context, unsafeAttrs, loadedPermissions, false, false, true)
                        .then(Promise.reject)
                        .catch((err) => {
                            assert.equal(err instanceof errors.NoPermissionError, true);
                        });
                });

                it('invite author', function () {
                    sinon.stub(Role, 'findOne').withArgs({id: 'role_id'}).resolves(roleModel);
                    roleModel.get.withArgs('name').returns('Author');

                    return Invite.permissible(inviteModel, 'add', context, unsafeAttrs, loadedPermissions, false, false, true)
                        .then(Promise.reject)
                        .catch((err) => {
                            assert.equal(err instanceof errors.NoPermissionError, true);
                        });
                });

                it('invite contributor', function () {
                    sinon.stub(Role, 'findOne').withArgs({id: 'role_id'}).resolves(roleModel);
                    roleModel.get.withArgs('name').returns('Contributor');

                    return Invite.permissible(inviteModel, 'add', context, unsafeAttrs, loadedPermissions, false, false, true)
                        .then(Promise.reject)
                        .catch((err) => {
                            assert.equal(err instanceof errors.NoPermissionError, true);
                        });
                });
            });

            describe('as contributor', function () {
                beforeEach(function () {
                    loadedPermissions.user.roles = [{name: 'Contributor'}];
                });

                it('invite administrator', function () {
                    sinon.stub(Role, 'findOne').withArgs({id: 'role_id'}).resolves(roleModel);
                    roleModel.get.withArgs('name').returns('Administrator');

                    return Invite.permissible(inviteModel, 'add', context, unsafeAttrs, loadedPermissions, false, false, true)
                        .then(Promise.reject)
                        .catch((err) => {
                            assert.equal(err instanceof errors.NoPermissionError, true);
                        });
                });

                it('invite editor', function () {
                    sinon.stub(Role, 'findOne').withArgs({id: 'role_id'}).resolves(roleModel);
                    roleModel.get.withArgs('name').returns('Editor');

                    return Invite.permissible(inviteModel, 'add', context, unsafeAttrs, loadedPermissions, false, false, true)
                        .then(Promise.reject)
                        .catch((err) => {
                            assert.equal(err instanceof errors.NoPermissionError, true);
                        });
                });

                it('invite author', function () {
                    sinon.stub(Role, 'findOne').withArgs({id: 'role_id'}).resolves(roleModel);
                    roleModel.get.withArgs('name').returns('Author');

                    return Invite.permissible(inviteModel, 'add', context, unsafeAttrs, loadedPermissions, false, false, true)
                        .then(Promise.reject)
                        .catch((err) => {
                            assert.equal(err instanceof errors.NoPermissionError, true);
                        });
                });

                it('invite contributor', function () {
                    sinon.stub(Role, 'findOne').withArgs({id: 'role_id'}).resolves(roleModel);
                    roleModel.get.withArgs('name').returns('Contributor');

                    return Invite.permissible(inviteModel, 'add', context, unsafeAttrs, loadedPermissions, false, false, true)
                        .then(Promise.reject)
                        .catch((err) => {
                            assert.equal(err instanceof errors.NoPermissionError, true);
                        });
                });
            });
        });
    });
});
