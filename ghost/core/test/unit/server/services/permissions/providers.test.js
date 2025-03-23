const should = require('should');
const sinon = require('sinon');
const testUtils = require('../../../../utils');
const models = require('../../../../../core/server/models');
const providers = require('../../../../../core/server/services/permissions/providers');

describe('Permission Providers', function () {
    before(function () {
        models.init();
    });

    afterEach(function () {
        sinon.restore();
    });

    describe('User', function () {
        it('errors if user cannot be found', function (done) {
            const findUserSpy = sinon.stub(models.User, 'findOne').callsFake(function () {
                return Promise.resolve();
            });

            providers.user(1)
                .then(function () {
                    done(new Error('Should have thrown a user not found error'));
                })
                .catch(function (err) {
                    findUserSpy.callCount.should.eql(1);
                    err.errorType.should.eql('NotFoundError');
                    done();
                });
        });

        it('can load user with role, and permissions', function (done) {
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
            providers.user(1)
                .then(function (res) {
                    findUserSpy.callCount.should.eql(1);

                    res.should.be.an.Object().with.properties('permissions', 'roles');

                    res.permissions.should.be.an.Array().with.lengthOf(10);
                    res.roles.should.be.an.Array().with.lengthOf(1);

                    // @TODO fix this!
                    // Permissions is an array of models
                    // Roles is a JSON array
                    res.permissions[0].should.be.an.Object().with.properties('attributes', 'id');
                    res.roles[0].should.be.an.Object().with.properties('id', 'name', 'description');
                    res.permissions[0].should.be.instanceOf(models.Base.Model);
                    res.roles[0].should.not.be.instanceOf(models.Base.Model);

                    done();
                })
                .catch(done);
        });

        it('can load user with role, and role.permissions', function (done) {
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
            providers.user(1)
                .then(function (res) {
                    findUserSpy.callCount.should.eql(1);

                    res.should.be.an.Object().with.properties('permissions', 'roles');

                    res.permissions.should.be.an.Array().with.lengthOf(10);
                    res.roles.should.be.an.Array().with.lengthOf(1);

                    // @TODO fix this!
                    // Permissions is an array of models
                    // Roles is a JSON array
                    res.permissions[0].should.be.an.Object().with.properties('attributes', 'id');
                    res.roles[0].should.be.an.Object().with.properties('id', 'name', 'description');
                    res.permissions[0].should.be.instanceOf(models.Base.Model);
                    res.roles[0].should.not.be.instanceOf(models.Base.Model);

                    done();
                })
                .catch(done);
        });

        it('can load user with role, permissions and role.permissions and deduplicate them', function (done) {
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
            providers.user(1)
                .then(function (res) {
                    findUserSpy.callCount.should.eql(1);

                    res.should.be.an.Object().with.properties('permissions', 'roles');

                    res.permissions.should.be.an.Array().with.lengthOf(10);
                    res.roles.should.be.an.Array().with.lengthOf(1);

                    // @TODO fix this!
                    // Permissions is an array of models
                    // Roles is a JSON array
                    res.permissions[0].should.be.an.Object().with.properties('attributes', 'id');
                    res.roles[0].should.be.an.Object().with.properties('id', 'name', 'description');
                    res.permissions[0].should.be.instanceOf(models.Base.Model);
                    res.roles[0].should.not.be.instanceOf(models.Base.Model);

                    done();
                })
                .catch(done);
        });

        it('throws when user with non-active status is loaded', function (done) {
            // This test requires quite a lot of unique setup work
            const findUserSpy = sinon.stub(models.User, 'findOne').callsFake(function () {
                // Create a fake model
                const fakeUser = models.User.forge(testUtils.DataGenerator.Content.users[0]);
                fakeUser.set('status', 'locked');

                return Promise.resolve(fakeUser);
            });

            // Get permissions for the user
            providers.user(1)
                .then(function () {
                    done(new Error('Locked user should should throw an error'));
                })
                .catch((err) => {
                    err.errorType.should.equal('UnauthorizedError');
                    findUserSpy.callCount.should.eql(1);
                    done();
                });
        });
    });

    describe('API Key', function () {
        it('errors if api_key cannot be found', function (done) {
            let findApiKeySpy = sinon.stub(models.ApiKey, 'findOne');
            findApiKeySpy.returns(Promise.resolve());
            providers.apiKey(1)
                .then(() => {
                    done(new Error('Should have thrown an api key not found error'));
                })
                .catch((err) => {
                    findApiKeySpy.callCount.should.eql(1);
                    err.errorType.should.eql('NotFoundError');
                    done();
                });
        });
        it('can load api_key with role, and role.permissions', function (done) {
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
            providers.apiKey(1).then((res) => {
                findApiKeySpy.callCount.should.eql(1);
                res.should.be.an.Object().with.properties('permissions', 'roles');
                res.roles.should.be.an.Array().with.lengthOf(1);
                res.permissions[0].should.be.an.Object().with.properties('attributes', 'id');
                res.roles[0].should.be.an.Object().with.properties('id', 'name', 'description');
                res.permissions[0].should.be.instanceOf(models.Base.Model);
                res.roles[0].should.not.be.instanceOf(models.Base.Model);
                done();
            }).catch(done);
        });
    });
});
