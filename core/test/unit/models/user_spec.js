const should = require('should'),
    sinon = require('sinon'),
    models = require('../../../server/models'),
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

    describe('fn: permissible', function () {
        function getUserModel(id, role) {
            var hasRole = sandbox.stub();

            hasRole.withArgs(role).returns(true);

            return {
                hasRole: hasRole,
                related: sandbox.stub().returns([{name: role}]),
                get: sandbox.stub().returns(id)
            };
        }

        it('cannot delete owner', function (done) {
            var mockUser = getUserModel(1, 'Owner'),
                context = {user: 1};

            models.User.permissible(mockUser, 'destroy', context, {}, testUtils.permissions.owner, true, true).then(() => {
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

            return models.User.permissible(mockUser, 'edit', context, {}, testUtils.permissions.contributor, false, true).then(() => {
                should(mockUser.get.calledOnce).be.true();
            });
        });

        describe('as editor', function () {
            it('can\'t edit another editor', function (done) {
                var mockUser = getUserModel(3, 'Editor'),
                    context = {user: 2};

                models.User.permissible(mockUser, 'edit', context, {}, testUtils.permissions.editor, true, true).then(() => {
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

                models.User.permissible(mockUser, 'edit', context, {}, testUtils.permissions.editor, true, true).then(() => {
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

                return models.User.permissible(mockUser, 'edit', context, {}, testUtils.permissions.editor, true, true).then(() => {
                    should(mockUser.hasRole.called).be.true();
                    should(mockUser.get.calledOnce).be.true();
                });
            });

            it('can edit contributor', function () {
                var mockUser = getUserModel(3, 'Contributor'),
                    context = {user: 2};

                return models.User.permissible(mockUser, 'edit', context, {}, testUtils.permissions.editor, true, true).then(() => {
                    should(mockUser.hasRole.called).be.true();
                    should(mockUser.get.calledOnce).be.true();
                });
            });

            it('can destroy self', function () {
                var mockUser = getUserModel(3, 'Editor'),
                    context = {user: 3};

                return models.User.permissible(mockUser, 'destroy', context, {}, testUtils.permissions.editor, true, true).then(() => {
                    should(mockUser.hasRole.called).be.true();
                    should(mockUser.get.calledOnce).be.true();
                });
            });

            it('can\'t destroy another editor', function (done) {
                var mockUser = getUserModel(3, 'Editor'),
                    context = {user: 2};

                models.User.permissible(mockUser, 'destroy', context, {}, testUtils.permissions.editor, true, true).then(() => {
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

                models.User.permissible(mockUser, 'destroy', context, {}, testUtils.permissions.editor, true, true).then(() => {
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

                return models.User.permissible(mockUser, 'destroy', context, {}, testUtils.permissions.editor, true, true).then(() => {
                    should(mockUser.hasRole.called).be.true();
                    should(mockUser.get.calledOnce).be.true();
                });
            });

            it('can destroy a contributor', function () {
                var mockUser = getUserModel(3, 'Contributor'),
                    context = {user: 2};

                return models.User.permissible(mockUser, 'destroy', context, {}, testUtils.permissions.editor, true, true).then(() => {
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
});
