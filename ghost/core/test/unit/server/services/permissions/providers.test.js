const assert = require('node:assert/strict');
const sinon = require('sinon');
const testUtils = require('../../../../utils');
const models = require('../../../../../core/server/models');
const providers = require('../../../../../core/server/services/permissions/providers');

describe('Permission Providers', function () {
    afterEach(function () {
        sinon.restore();
    });

    describe('User', function () {
        it('errors if user cannot be found', async function () {
            const findUserSpy = sinon.stub(models.User, 'findOne').callsFake(function () {
                return Promise.resolve();
            });

            await assert.rejects(async () => {
                await providers.user(1);
            }, {
                errorType: 'NotFoundError'
            });
            sinon.assert.calledOnce(findUserSpy);
        });

        it('can load user with role, and permissions', async function () {
            // This test requires quite a lot of unique setup work
            const findUserSpy = sinon.stub(models.User, 'findOne').callsFake(function () {
                // Create a fake model
                const fakeUser = models.User.forge(testUtils.DataGenerator.Content.users[0]);
                fakeUser.set('status', 'active');

                // Roles & Permissions need to be collections
                const fakeAdminRole = models.Roles.forge(testUtils.DataGenerator.Content.roles[0]);

                const fakeAdminRolePermissions = models.Permissions.forge(testUtils.DataGenerator.Content.permissions);

                // ## Fake the relations
                // User is related to roles & permissions
                fakeUser.relations = {
                    roles: fakeAdminRole,
                    permissions: fakeAdminRolePermissions
                };

                // We use this inside toJSON.
                fakeUser.withRelated = ['roles', 'permissions', 'roles.permissions'];

                return Promise.resolve(fakeUser);
            });

            // Get permissions for the user
            const res = await providers.user(1);
            sinon.assert.calledOnce(findUserSpy);

            assert(res && typeof res === 'object');
            assert('permissions' in res);
            assert('roles' in res);

            assert(Array.isArray(res.permissions));
            assert.equal(res.permissions.length, 10);
            assert(Array.isArray(res.roles));
            assert.equal(res.roles.length, 1);

            // @TODO fix this!
            // Permissions is an array of models
            // Roles is a JSON array
            assert(res.permissions[0] && typeof res.permissions[0] === 'object');
            assert('attributes' in res.permissions[0]);
            assert('id' in res.permissions[0]);
            assert(res.roles[0] && typeof res.roles[0] === 'object');
            assert('id' in res.roles[0]);
            assert('name' in res.roles[0]);
            assert('description' in res.roles[0]);
            assert(res.permissions[0] instanceof models.Base.Model);
            assert(!(res.roles[0] instanceof models.Base.Model));
        });

        it('can load user with role, and role.permissions', async function () {
            // This test requires quite a lot of unique setup work
            const findUserSpy = sinon.stub(models.User, 'findOne').callsFake(function () {
                // Create a fake model
                const fakeUser = models.User.forge(testUtils.DataGenerator.Content.users[0]);
                fakeUser.set('status', 'active');

                // Roles & Permissions need to be collections
                const fakeAdminRole = models.Roles.forge(testUtils.DataGenerator.Content.roles[0]);

                const fakeAdminRolePermissions = models.Permissions.forge(testUtils.DataGenerator.Content.permissions);

                // ## Fake the relations
                // Roles are related to permissions
                fakeAdminRole.models[0].relations = {
                    permissions: fakeAdminRolePermissions
                };
                // User is related to roles
                fakeUser.relations = {
                    roles: fakeAdminRole
                };
                // We use this inside toJSON.
                fakeUser.withRelated = ['roles', 'permissions', 'roles.permissions'];

                return Promise.resolve(fakeUser);
            });

            // Get permissions for the user
            const res = await providers.user(1);
            sinon.assert.calledOnce(findUserSpy);

            assert(res && typeof res === 'object');
            assert('permissions' in res);
            assert('roles' in res);

            assert(Array.isArray(res.permissions));
            assert.equal(res.permissions.length, 10);
            assert(Array.isArray(res.roles));
            assert.equal(res.roles.length, 1);

            // @TODO fix this!
            // Permissions is an array of models
            // Roles is a JSON array
            assert(res.permissions[0] && typeof res.permissions[0] === 'object');
            assert('attributes' in res.permissions[0]);
            assert('id' in res.permissions[0]);
            assert(res.roles[0] && typeof res.roles[0] === 'object');
            assert('id' in res.roles[0]);
            assert('name' in res.roles[0]);
            assert('description' in res.roles[0]);
            assert(res.permissions[0] instanceof models.Base.Model);
            assert(!(res.roles[0] instanceof models.Base.Model));
        });

        it('can load user with role, permissions and role.permissions and deduplicate them', async function () {
            // This test requires quite a lot of unique setup work
            const findUserSpy = sinon.stub(models.User, 'findOne').callsFake(function () {
                // Create a fake model
                const fakeUser = models.User.forge(testUtils.DataGenerator.Content.users[0]);
                fakeUser.set('status', 'active');

                // Roles & Permissions need to be collections
                const fakeAdminRole = models.Roles.forge(testUtils.DataGenerator.Content.roles[0]);

                const fakeAdminRolePermissions = models.Permissions.forge(testUtils.DataGenerator.Content.permissions);

                // ## Fake the relations
                // Roles are related to permissions
                fakeAdminRole.models[0].relations = {
                    permissions: fakeAdminRolePermissions
                };
                // User is related to roles and permissions
                fakeUser.relations = {
                    roles: fakeAdminRole,
                    permissions: fakeAdminRolePermissions
                };
                // We use this inside toJSON.
                fakeUser.withRelated = ['roles', 'permissions', 'roles.permissions'];

                return Promise.resolve(fakeUser);
            });

            // Get permissions for the user
            const res = await providers.user(1);
            sinon.assert.calledOnce(findUserSpy);

            assert(res && typeof res === 'object');
            assert('permissions' in res);
            assert('roles' in res);

            assert(Array.isArray(res.permissions));
            assert.equal(res.permissions.length, 10);
            assert(Array.isArray(res.roles));
            assert.equal(res.roles.length, 1);

            // @TODO fix this!
            // Permissions is an array of models
            // Roles is a JSON array
            assert(res.permissions[0] && typeof res.permissions[0] === 'object');
            assert('attributes' in res.permissions[0]);
            assert('id' in res.permissions[0]);
            assert(res.roles[0] && typeof res.roles[0] === 'object');
            assert('id' in res.roles[0]);
            assert('name' in res.roles[0]);
            assert('description' in res.roles[0]);
            assert(res.permissions[0] instanceof models.Base.Model);
            assert(!(res.roles[0] instanceof models.Base.Model));
        });

        it('throws when user with non-active status is loaded', async function () {
            // This test requires quite a lot of unique setup work
            const findUserSpy = sinon.stub(models.User, 'findOne').callsFake(function () {
                // Create a fake model
                const fakeUser = models.User.forge(testUtils.DataGenerator.Content.users[0]);
                fakeUser.set('status', 'locked');

                return Promise.resolve(fakeUser);
            });

            // Get permissions for the user
            await assert.rejects(async () => {
                await providers.user(1);
            }, {
                errorType: 'UnauthorizedError'
            });
            sinon.assert.calledOnce(findUserSpy);
        });
    });

    describe('API Key', function () {
        it('errors if api_key cannot be found', async function () {
            let findApiKeySpy = sinon.stub(models.ApiKey, 'findOne');
            findApiKeySpy.returns(Promise.resolve());

            await assert.rejects(async () => {
                await providers.apiKey(1);
            }, {
                errorType: 'NotFoundError'
            });
            sinon.assert.calledOnce(findApiKeySpy);
        });
        it('can load api_key with role, and role.permissions', async function () {
            const findApiKeySpy = sinon.stub(models.ApiKey, 'findOne').callsFake(function () {
                const fakeApiKey = models.ApiKey.forge(testUtils.DataGenerator.Content.api_keys[0]);
                const fakeAdminRole = models.Role.forge(testUtils.DataGenerator.Content.roles[0]);
                const fakeAdminRolePermissions = models.Permissions.forge(testUtils.DataGenerator.Content.permissions);
                fakeAdminRole.relations = {
                    permissions: fakeAdminRolePermissions
                };
                fakeApiKey.relations = {
                    role: fakeAdminRole
                };
                fakeApiKey.withRelated = ['role', 'role.permissions'];
                return Promise.resolve(fakeApiKey);
            });
            const res = await providers.apiKey(1);
            sinon.assert.calledOnce(findApiKeySpy);
            assert(res && typeof res === 'object');
            assert('permissions' in res);
            assert('roles' in res);
            assert(Array.isArray(res.roles));
            assert.equal(res.roles.length, 1);
            assert(res.permissions[0] && typeof res.permissions[0] === 'object');
            assert('attributes' in res.permissions[0]);
            assert('id' in res.permissions[0]);
            assert(res.roles[0] && typeof res.roles[0] === 'object');
            assert('id' in res.roles[0]);
            assert('name' in res.roles[0]);
            assert('description' in res.roles[0]);
            assert(res.permissions[0] instanceof models.Base.Model);
            assert(!(res.roles[0] instanceof models.Base.Model));
        });
    });
});
