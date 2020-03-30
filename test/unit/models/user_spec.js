const should = require('should'),
    url = require('url'),
    sinon = require('sinon'),
    Promise = require('bluebird'),
    _ = require('lodash'),
    schema = require('../../../core/server/data/schema'),
    models = require('../../../core/server/models'),
    permissions = require('../../../core/server/services/permissions'),
    validation = require('../../../core/server/data/validation'),
    common = require('../../../core/server/lib/common'),
    security = require('../../../core/server/lib/security'),
    testUtils = require('../../utils');

describe('Unit: models/user', function () {
    before(function () {
        models.init();
    });

    afterEach(function () {
        sinon.restore();
    });

    describe('updateLastSeen method', function () {
        it('exists', function () {
            should.equal(typeof models.User.prototype.updateLastSeen, 'function');
        });

        it('sets the last_seen property to new Date and returns a call to save', function () {
            const instance = {
                set: sinon.spy(),
                save: sinon.stub().resolves()
            };

            const now = new Date();
            const clock = sinon.useFakeTimers(now.getTime());

            const returnVal = models.User.prototype.updateLastSeen.call(instance);

            should.deepEqual(instance.set.args[0][0], {
                last_seen: now
            });

            should.equal(returnVal, instance.save.returnValues[0]);

            clock.restore();
        });
    });

    describe('validation', function () {
        beforeEach(function () {
            sinon.stub(security.password, 'hash').resolves('$2a$10$we16f8rpbrFZ34xWj0/ZC.LTPUux8ler7bcdTs5qIleN6srRHhilG');
        });

        describe('blank', function () {
            it('name cannot be blank', function () {
                return models.User.add({email: 'test@ghost.org'})
                    .then(function () {
                        throw new Error('expected ValidationError');
                    })
                    .catch(function (err) {
                        (err instanceof common.errors.ValidationError).should.eql(true);
                        err.message.should.match(/users\.name/);
                    });
            });

            it('email cannot be blank', function () {
                let data = {name: 'name'};
                sinon.stub(models.User, 'findOne').resolves(null);

                return models.User.add(data)
                    .then(function () {
                        throw new Error('expected ValidationError');
                    })
                    .catch(function (err) {
                        err.should.be.an.Array();
                        (err[0] instanceof common.errors.ValidationError).should.eql(true);
                        err[0].message.should.match(/users\.email/);
                    });
            });
        });
    });

    describe('fn: check', function () {
        beforeEach(function () {
            sinon.stub(security.password, 'hash').resolves('$2a$10$we16f8rpbrFZ34xWj0/ZC.LTPUux8ler7bcdTs5qIleN6srRHhilG');
        });

        it('user status is warn', function () {
            sinon.stub(security.password, 'compare').resolves(true);

            // NOTE: Add a user with a broken field to ensure we only validate changed fields on login
            sinon.stub(validation, 'validateSchema').resolves();

            const user = models.User.forge(testUtils.DataGenerator.forKnex.createUser({
                status: 'warn-1',
                email: 'test-9@example.de',
                website: '!!!!!this-is-not-a-website!!!!'
            }));

            sinon.stub(models.User, 'getByEmail').resolves(user);
            sinon.stub(models.User, 'isPasswordCorrect').resolves();

            sinon.stub(user, 'updateLastSeen').resolves();
            sinon.stub(user, 'save').resolves();

            return models.User.check({email: user.get('email'), password: 'test'});
        });

        it('user status is active', function () {
            const user = models.User.forge(testUtils.DataGenerator.forKnex.createUser({
                status: 'active',
                email: 'test@ghost.de'
            }));

            sinon.stub(models.User, 'getByEmail').resolves(user);
            sinon.stub(models.User, 'isPasswordCorrect').resolves();

            sinon.stub(user, 'updateLastSeen').resolves();
            sinon.stub(user, 'save').resolves();

            return models.User.check({email: user.get('email'), password: 'test'});
        });

        it('password is incorrect', function () {
            const user = models.User.forge(testUtils.DataGenerator.forKnex.createUser({
                status: 'active',
                email: 'test@ghost.de'
            }));

            sinon.stub(models.User, 'getByEmail').resolves(user);
            sinon.stub(models.User, 'isPasswordCorrect').rejects(new common.errors.ValidationError());

            return models.User.check({email: user.get('email'), password: 'test'})
                .catch(function (err) {
                    (err instanceof common.errors.ValidationError).should.eql(true);
                });
        });
    });

    describe('permissible', function () {
        function getUserModel(id, role, roleId) {
            var hasRole = sinon.stub();

            hasRole.withArgs(role).returns(true);

            return {
                id: id,
                hasRole: hasRole,
                related: sinon.stub().returns([{name: role, id: roleId}]),
                get: sinon.stub().returns(id)
            };
        }

        it('cannot delete owner', function (done) {
            var mockUser = getUserModel(1, 'Owner'),
                context = {user: 1};

            models.User.permissible(mockUser, 'destroy', context, {}, testUtils.permissions.owner, true, true, true).then(() => {
                done(new Error('Permissible function should have errored'));
            }).catch((error) => {
                error.should.be.an.instanceof(common.errors.NoPermissionError);
                should(mockUser.hasRole.calledOnce).be.true();
                done();
            });
        });

        it('can always edit self', function () {
            var mockUser = getUserModel(3, 'Contributor'),
                context = {user: 3};

            return models.User.permissible(mockUser, 'edit', context, {}, testUtils.permissions.contributor, false, true, true).then(() => {
                should(mockUser.get.calledOnce).be.true();
            });
        });

        it('cannot edit my status to inactive', function () {
            var mockUser = getUserModel(3, 'Editor'),
                context = {user: 3};

            return models.User.permissible(mockUser, 'edit', context, {status: 'inactive'}, testUtils.permissions.editor, false, true, true)
                .then(Promise.reject)
                .catch((err) => {
                    err.should.be.an.instanceof(common.errors.NoPermissionError);
                });
        });

        it('without related roles', function () {
            sinon.stub(models.User, 'findOne').withArgs({
                id: 3,
                status: 'all'
            }, {withRelated: ['roles']}).resolves(getUserModel(3, 'Contributor'));

            const mockUser = {id: 3, related: sinon.stub().returns()};
            const context = {user: 3};

            return models.User.permissible(mockUser, 'edit', context, {}, testUtils.permissions.contributor, false, true, true)
                .then(() => {
                    models.User.findOne.calledOnce.should.be.true();
                });
        });

        describe('change role', function () {
            function getUserToEdit(id, role) {
                var hasRole = sinon.stub();

                hasRole.withArgs(role).returns(true);

                return {
                    id: id,
                    hasRole: hasRole,
                    related: sinon.stub().returns([role]),
                    get: sinon.stub().returns(id)
                };
            }

            beforeEach(function () {
                sinon.stub(models.User, 'getOwnerUser');
                sinon.stub(permissions, 'canThis');

                models.User.getOwnerUser.resolves({
                    id: testUtils.context.owner.context.user,
                    related: () => {
                        return {
                            at: () => {
                                return testUtils.permissions.owner.user.roles[0].id;
                            }
                        };
                    }
                });
            });

            it('cannot change own role', function () {
                const mockUser = getUserToEdit(testUtils.context.admin.context.user, testUtils.permissions.editor.user.roles[0]);
                const context = testUtils.context.admin.context;
                const unsafeAttrs = testUtils.permissions.editor.user;

                return models.User.permissible(mockUser, 'edit', context, unsafeAttrs, testUtils.permissions.admin, false, true, true)
                    .then(Promise.reject)
                    .catch((err) => {
                        err.should.be.an.instanceof(common.errors.NoPermissionError);
                    });
            });

            it('is owner and does not change the role', function () {
                const mockUser = getUserToEdit(testUtils.context.owner.context.user, testUtils.permissions.owner.user.roles[0]);
                const context = testUtils.context.owner.context;
                const unsafeAttrs = testUtils.permissions.owner.user;

                return models.User.permissible(mockUser, 'edit', context, unsafeAttrs, testUtils.permissions.owner, false, true, true)
                    .then(() => {
                        models.User.getOwnerUser.calledOnce.should.be.true();
                    });
            });

            it('cannot change owner\'s role', function () {
                const mockUser = getUserToEdit(testUtils.context.owner.context.user, testUtils.permissions.owner.user.roles[0]);
                const context = testUtils.context.admin.context;
                const unsafeAttrs = testUtils.permissions.editor.user;

                return models.User.permissible(mockUser, 'edit', context, unsafeAttrs, testUtils.permissions.admin, false, true, true)
                    .then(Promise.reject)
                    .catch((err) => {
                        err.should.be.an.instanceof(common.errors.NoPermissionError);
                    });
            });

            it('admin can change author role', function () {
                const mockUser = getUserToEdit(testUtils.context.author.context.user, testUtils.permissions.author.user.roles[0]);
                const context = testUtils.context.admin.context;
                const unsafeAttrs = testUtils.permissions.editor.user;

                permissions.canThis.returns({
                    assign: {
                        role: sinon.stub().resolves()
                    }
                });

                return models.User.permissible(mockUser, 'edit', context, unsafeAttrs, testUtils.permissions.admin, true, true, true)
                    .then(() => {
                        models.User.getOwnerUser.calledOnce.should.be.true();
                        permissions.canThis.calledOnce.should.be.true();
                    });
            });

            it('author can\'t change admin role', function () {
                const mockUser = getUserToEdit(testUtils.context.admin.context.user, testUtils.permissions.admin.user.roles[0]);
                const context = testUtils.context.author.context;
                const unsafeAttrs = testUtils.permissions.editor.user;

                permissions.canThis.returns({
                    assign: {
                        role: sinon.stub().resolves()
                    }
                });

                return models.User.permissible(mockUser, 'edit', context, unsafeAttrs, testUtils.permissions.author, false, true, true)
                    .then(Promise.reject)
                    .catch((err) => {
                        err.should.be.an.instanceof(common.errors.NoPermissionError);
                    });
            });
        });

        describe('as editor', function () {
            it('can\'t edit another editor', function (done) {
                var mockUser = getUserModel(3, 'Editor'),
                    context = {user: 2};

                models.User.permissible(mockUser, 'edit', context, {}, testUtils.permissions.editor, true, true, true).then(() => {
                    done(new Error('Permissible function should have errored'));
                }).catch((error) => {
                    error.should.be.an.instanceof(common.errors.NoPermissionError);
                    should(mockUser.hasRole.called).be.true();
                    should(mockUser.get.calledOnce).be.true();
                    done();
                });
            });

            it('can\'t edit owner', function (done) {
                var mockUser = getUserModel(3, 'Owner'),
                    context = {user: 2};

                models.User.permissible(mockUser, 'edit', context, {}, testUtils.permissions.editor, true, true, true).then(() => {
                    done(new Error('Permissible function should have errored'));
                }).catch((error) => {
                    error.should.be.an.instanceof(common.errors.NoPermissionError);
                    should(mockUser.hasRole.called).be.true();
                    should(mockUser.get.calledOnce).be.true();
                    done();
                });
            });

            it('can\'t edit an admin', function (done) {
                var mockUser = getUserModel(3, 'Administrator'),
                    context = {user: 2};

                models.User.permissible(mockUser, 'edit', context, {}, testUtils.permissions.editor, true, true, true).then(() => {
                    done(new Error('Permissible function should have errored'));
                }).catch((error) => {
                    error.should.be.an.instanceof(common.errors.NoPermissionError);
                    should(mockUser.hasRole.called).be.true();
                    should(mockUser.get.calledOnce).be.true();
                    done();
                });
            });

            it('can edit author', function () {
                var mockUser = getUserModel(3, 'Author'),
                    context = {user: 2};

                return models.User.permissible(mockUser, 'edit', context, {}, testUtils.permissions.editor, true, true, true).then(() => {
                    should(mockUser.hasRole.called).be.true();
                    should(mockUser.get.calledOnce).be.true();
                });
            });

            it('can edit contributor', function () {
                var mockUser = getUserModel(3, 'Contributor'),
                    context = {user: 2};

                return models.User.permissible(mockUser, 'edit', context, {}, testUtils.permissions.editor, true, true, true).then(() => {
                    should(mockUser.hasRole.called).be.true();
                    should(mockUser.get.calledOnce).be.true();
                });
            });

            it('can destroy self', function () {
                var mockUser = getUserModel(3, 'Editor'),
                    context = {user: 3};

                return models.User.permissible(mockUser, 'destroy', context, {}, testUtils.permissions.editor, true, true, true).then(() => {
                    should(mockUser.hasRole.called).be.true();
                    should(mockUser.get.calledOnce).be.true();
                });
            });

            it('can\'t destroy another editor', function (done) {
                var mockUser = getUserModel(3, 'Editor'),
                    context = {user: 2};

                models.User.permissible(mockUser, 'destroy', context, {}, testUtils.permissions.editor, true, true, true).then(() => {
                    done(new Error('Permissible function should have errored'));
                }).catch((error) => {
                    error.should.be.an.instanceof(common.errors.NoPermissionError);
                    should(mockUser.hasRole.called).be.true();
                    should(mockUser.get.calledOnce).be.true();
                    done();
                });
            });

            it('can\'t destroy an admin', function (done) {
                var mockUser = getUserModel(3, 'Administrator'),
                    context = {user: 2};

                models.User.permissible(mockUser, 'destroy', context, {}, testUtils.permissions.editor, true, true, true).then(() => {
                    done(new Error('Permissible function should have errored'));
                }).catch((error) => {
                    error.should.be.an.instanceof(common.errors.NoPermissionError);
                    should(mockUser.hasRole.called).be.true();
                    should(mockUser.get.calledOnce).be.true();
                    done();
                });
            });

            it('can destroy an author', function () {
                var mockUser = getUserModel(3, 'Author'),
                    context = {user: 2};

                return models.User.permissible(mockUser, 'destroy', context, {}, testUtils.permissions.editor, true, true, true).then(() => {
                    should(mockUser.hasRole.called).be.true();
                    should(mockUser.get.calledOnce).be.true();
                });
            });

            it('can destroy a contributor', function () {
                var mockUser = getUserModel(3, 'Contributor'),
                    context = {user: 2};

                return models.User.permissible(mockUser, 'destroy', context, {}, testUtils.permissions.editor, true, true, true).then(() => {
                    should(mockUser.hasRole.called).be.true();
                    should(mockUser.get.calledOnce).be.true();
                });
            });
        });
    });

    describe('transferOwnership', function () {
        beforeEach(function () {
            sinon.stub(models.Role, 'findOne');

            models.Role.findOne
                .withArgs({name: 'Owner'})
                .resolves(testUtils.permissions.owner.user.roles[0]);

            models.Role.findOne
                .withArgs({name: 'Administrator'})
                .resolves(testUtils.permissions.admin.user.roles[0]);

            sinon.stub(models.User, 'findOne');
        });

        it('Cannot transfer ownership if not owner', function () {
            const loggedInUser = testUtils.context.admin;
            const userToChange = loggedInUser;
            const contextUser = sinon.stub();

            contextUser.toJSON = sinon.stub().returns(testUtils.permissions.admin.user);

            models.User
                .findOne
                .withArgs({id: loggedInUser.context.user}, {withRelated: ['roles']})
                .resolves(contextUser);

            return models.User.transferOwnership({id: loggedInUser.context.user}, loggedInUser)
                .then(Promise.reject)
                .catch((err) => {
                    err.should.be.an.instanceof(common.errors.NoPermissionError);
                });
        });

        it('Owner tries to transfer ownership to editor', function () {
            const loggedInUser = testUtils.context.owner;
            const userToChange = testUtils.context.editor;

            const loggedInContext = {
                toJSON: sinon.stub().returns(testUtils.permissions.owner.user)
            };
            const userToChangeContext = {
                toJSON: sinon.stub().returns(
                    // Test utils don't contain `status` which is required
                    Object.assign({status: 'active'}, testUtils.permissions.editor.user)
                )
            };

            models.User
                .findOne
                .withArgs({id: loggedInUser.context.user}, {withRelated: ['roles']})
                .resolves(loggedInContext);

            models.User
                .findOne
                .withArgs({id: userToChange.context.user}, {withRelated: ['roles']})
                .resolves(userToChangeContext);

            return models.User.transferOwnership({id: userToChange.context.user}, loggedInUser)
                .then(Promise.reject)
                .catch((err) => {
                    err.should.be.an.instanceof(common.errors.ValidationError);
                    err.message.indexOf('Only administrators can')
                        .should.be.aboveOrEqual(0, 'contains correct error message');
                });
        });

        it('Owner tries to transfer ownership to suspended user', function () {
            const loggedInUser = testUtils.context.owner;
            const userToChange = testUtils.context.admin;

            const userToChangeJSON = Object.assign({status: 'inactive'}, testUtils.permissions.admin.user);
            const loggedInContext = {
                toJSON: sinon.stub().returns(testUtils.permissions.owner.user)
            };
            const userToChangeContext = {
                toJSON: sinon.stub().returns(userToChangeJSON)
            };

            models.User
                .findOne
                .withArgs({id: loggedInUser.context.user}, {withRelated: ['roles']})
                .resolves(loggedInContext);

            models.User
                .findOne
                .withArgs({id: userToChange.context.user}, {withRelated: ['roles']})
                .resolves(userToChangeContext);

            return models.User.transferOwnership({id: userToChange.context.user}, loggedInUser)
                .then(Promise.reject)
                .catch((err) => {
                    err.should.be.an.instanceof(common.errors.ValidationError);
                    err.message.indexOf('Only active administrators can')
                        .should.be.aboveOrEqual(0, 'contains correct error message');
                });
        });
    });

    describe('isSetup', function () {
        it('active', function () {
            sinon.stub(models.User, 'getOwnerUser').resolves({get: sinon.stub().returns('active')});

            return models.User.isSetup()
                .then((result) => {
                    result.should.be.true();
                });
        });

        it('inactive', function () {
            sinon.stub(models.User, 'getOwnerUser').resolves({get: sinon.stub().returns('inactive')});

            return models.User.isSetup()
                .then((result) => {
                    result.should.be.false();
                });
        });
    });
});
