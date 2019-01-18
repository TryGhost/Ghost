const should = require('should'),
    url = require('url'),
    sinon = require('sinon'),
    Promise = require('bluebird'),
    _ = require('lodash'),
    schema = require('../../../server/data/schema'),
    models = require('../../../server/models'),
    permissions = require('../../../server/services/permissions'),
    validation = require('../../../server/data/validation'),
    common = require('../../../server/lib/common'),
    security = require('../../../server/lib/security'),
    testUtils = require('../../utils'),
    sandbox = sinon.sandbox.create();

describe('Unit: models/user', function () {
    before(function () {
        models.init();
    });

    before(testUtils.teardown);
    before(testUtils.setup('users:roles'));

    afterEach(function () {
        sandbox.restore();
    });

    describe('updateLastSeen method', function () {
        it('exists', function () {
            should.equal(typeof models.User.prototype.updateLastSeen, 'function');
        });

        it('sets the last_seen property to new Date and returns a call to save', function () {
            const instance = {
                set: sandbox.spy(),
                save: sandbox.stub().resolves()
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
            sandbox.stub(security.password, 'hash').resolves('$2a$10$we16f8rpbrFZ34xWj0/ZC.LTPUux8ler7bcdTs5qIleN6srRHhilG');
        });

        describe('password', function () {
            it('no password', function () {
                return models.User.add({email: 'test1@ghost.org', name: 'Ghosty'})
                    .then(function (user) {
                        user.get('name').should.eql('Ghosty');
                        should.exist(user.get('password'));
                    });
            });

            it('only numbers', function () {
                return models.User.add({email: 'test2@ghost.org', name: 'Wursti', password: 109674836589})
                    .then(function (user) {
                        user.get('name').should.eql('Wursti');
                        should.exist(user.get('password'));
                    });
            });

            it('can change password', function () {
                let oldPassword;

                return models.User.findOne({slug: 'joe-bloggs'})
                    .then(function (user) {
                        user.get('slug').should.eql('joe-bloggs');
                        oldPassword = user.get('password');
                        user.set('password', '12734!!332');
                        return user.save();
                    })
                    .then(function (user) {
                        user.get('slug').should.eql('joe-bloggs');
                        user.get('password').should.not.eql(oldPassword);
                    });
            });
        });

        describe('blank', function () {
            it('name cannot be blank', function () {
                return models.User.add({email: 'test@ghost.org'})
                    .then(function () {
                        throw new Error('expected ValidationError');
                    })
                    .catch(function (err) {
                        (err instanceof common.errors.ValidationError).should.be.true;
                        err.message.should.match(/users\.name/);
                    });
            });

            it('email cannot be blank', function () {
                let data = {name: 'name'};
                sandbox.stub(models.User, 'findOne').resolves(null);

                return models.User.add(data)
                    .then(function () {
                        throw new Error('expected ValidationError');
                    })
                    .catch(function (err) {
                        err.should.be.an.Array();
                        (err[0] instanceof common.errors.ValidationError).should.eql.true;
                        err[0].message.should.match(/users\.email/);
                    });
            });
        });
    });

    describe('fn: check', function () {
        beforeEach(function () {
            sandbox.stub(security.password, 'hash').resolves('$2a$10$we16f8rpbrFZ34xWj0/ZC.LTPUux8ler7bcdTs5qIleN6srRHhilG');
        });

        it('user status is warn', function () {
            sandbox.stub(security.password, 'compare').resolves(true);

            // NOTE: Add a user with a broken field to ensure we only validate changed fields on login
            sandbox.stub(validation, 'validateSchema').resolves();

            const user = testUtils.DataGenerator.forKnex.createUser({
                status: 'warn-1',
                email: 'test-9@example.de',
                website: '!!!!!this-is-not-a-website!!!!'
            });

            return models.User.add(user)
                .then(function (model) {
                    validation.validateSchema.restore();

                    return models.User.check({email: model.get('email'), password: 'test'});
                });
        });

        it('user status is active', function () {
            sandbox.stub(security.password, 'compare').resolves(true);

            return models.User.check({email: testUtils.DataGenerator.Content.users[1].email, password: 'test'});
        });

        it('password is incorrect', function () {
            sandbox.stub(security.password, 'compare').resolves(false);

            return models.User.check({email: testUtils.DataGenerator.Content.users[1].email, password: 'test'})
                .catch(function (err) {
                    (err instanceof common.errors.ValidationError).should.be.true;
                });
        });

        it('user not found', function () {
            sandbox.stub(security.password, 'compare').resolves(true);

            return models.User.check({email: 'notfound@example.to', password: 'test'})
                .catch(function (err) {
                    (err instanceof common.errors.NotFoundError).should.be.true;
                });
        });

        it('user not found', function () {
            sandbox.stub(security.password, 'compare').resolves(true);

            return models.User.check({email: null, password: 'test'})
                .catch(function (err) {
                    (err instanceof common.errors.NotFoundError).should.be.true;
                });
        });
    });

    describe('permissible', function () {
        function getUserModel(id, role, roleId) {
            var hasRole = sandbox.stub();

            hasRole.withArgs(role).returns(true);

            return {
                id: id,
                hasRole: hasRole,
                related: sandbox.stub().returns([{name: role, id: roleId}]),
                get: sandbox.stub().returns(id)
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
            sandbox.stub(models.User, 'findOne').withArgs({
                id: 3,
                status: 'all'
            }, {withRelated: ['roles']}).resolves(getUserModel(3, 'Contributor'));

            const mockUser = {id: 3, related: sandbox.stub().returns()};
            const context = {user: 3};

            return models.User.permissible(mockUser, 'edit', context, {}, testUtils.permissions.contributor, false, true, true)
                .then(() => {
                    models.User.findOne.calledOnce.should.be.true();
                });
        });

        describe('change role', function () {
            function getUserToEdit(id, role) {
                var hasRole = sandbox.stub();

                hasRole.withArgs(role).returns(true);

                return {
                    id: id,
                    hasRole: hasRole,
                    related: sandbox.stub().returns([role]),
                    get: sandbox.stub().returns(id)
                };
            }

            beforeEach(function () {
                sandbox.stub(models.User, 'getOwnerUser');
                sandbox.stub(permissions, 'canThis');

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
                        role: sandbox.stub().resolves()
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
                        role: sandbox.stub().resolves()
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

    describe('Fetch', function () {
        before(function () {
            models.init();
        });

        after(function () {
            sandbox.restore();
        });

        it('ensure data type', function () {
            return models.User.findOne({slug: 'joe-bloggs'}, testUtils.context.internal)
                .then((user) => {
                    user.get('updated_by').should.be.a.String();
                    user.get('created_by').should.be.a.String();
                    user.get('created_at').should.be.a.Date();
                    user.get('updated_at').should.be.a.Date();
                });
        });
    });

    describe('Edit', function () {
        before(function () {
            models.init();
        });

        after(function () {
            sandbox.restore();
        });

        it('resets given empty value to null', function () {
            return models.User.findOne({slug: 'joe-bloggs'})
                .then(function (user) {
                    user.get('slug').should.eql('joe-bloggs');
                    user.get('profile_image').should.eql('https://example.com/super_photo.jpg');
                    user.set('profile_image', '');
                    user.set('bio', '');
                    return user.save();
                })
                .then(function (user) {
                    should(user.get('profile_image')).be.null();
                    user.get('bio').should.eql('');
                });
        });
    });

    describe('Add', function () {
        const events = {
            user: []
        };

        before(function () {
            models.init();

            sandbox.stub(models.User.prototype, 'emitChange').callsFake(function (event) {
                events.user.push({event: event, data: this.toJSON()});
            });
        });

        after(function () {
            sandbox.restore();
        });

        it('defaults', function () {
            return models.User.add({slug: 'joe', name: 'Joe', email: 'joe@test.com'})
                .then(function (user) {
                    user.get('name').should.eql('Joe');
                    user.get('email').should.eql('joe@test.com');
                    user.get('slug').should.eql('joe');
                    user.get('visibility').should.eql('public');
                    user.get('status').should.eql('active');

                    _.each(_.keys(schema.tables.users), (key) => {
                        should.exist(events.user[0].data.hasOwnProperty(key));

                        if (['status', 'visibility'].indexOf(key) !== -1) {
                            events.user[0].data[key].should.eql(schema.tables.users[key].defaultTo);
                        }
                    });
                });
        });
    });

    describe('transferOwnership', function () {
        let ownerRole;

        beforeEach(function () {
            ownerRole = sandbox.stub();

            sandbox.stub(models.Role, 'findOne');

            models.Role.findOne
                .withArgs({name: 'Owner'})
                .resolves(testUtils.permissions.owner.user.roles[0]);

            models.Role.findOne
                .withArgs({name: 'Administrator'})
                .resolves(testUtils.permissions.admin.user.roles[0]);

            sandbox.stub(models.User, 'findOne');
        });

        it('Cannot transfer ownership if not owner', function () {
            const loggedInUser = testUtils.context.admin;
            const userToChange = loggedInUser;
            const contextUser = sandbox.stub();

            contextUser.toJSON = sandbox.stub().returns(testUtils.permissions.admin.user);

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

        it('Owner tries to transfer ownership to author', function () {
            const loggedInUser = testUtils.context.owner;
            const userToChange = testUtils.context.editor;
            const contextUser = sandbox.stub();

            contextUser.toJSON = sandbox.stub().returns(testUtils.permissions.owner.user);

            models.User
                .findOne
                .withArgs({id: loggedInUser.context.user}, {withRelated: ['roles']})
                .resolves(contextUser);

            models.User
                .findOne
                .withArgs({id: userToChange.context.user}, {withRelated: ['roles']})
                .resolves(contextUser);

            return models.User.transferOwnership({id: userToChange.context.user}, loggedInUser)
                .then(Promise.reject)
                .catch((err) => {
                    err.should.be.an.instanceof(common.errors.ValidationError);
                });
        });
    });

    describe('isSetup', function () {
        it('active', function () {
            sandbox.stub(models.User, 'getOwnerUser').resolves({get: sandbox.stub().returns('active')});

            return models.User.isSetup()
                .then((result) => {
                    result.should.be.true();
                });
        });

        it('inactive', function () {
            sandbox.stub(models.User, 'getOwnerUser').resolves({get: sandbox.stub().returns('inactive')});

            return models.User.isSetup()
                .then((result) => {
                    result.should.be.false();
                });
        });
    });
});
