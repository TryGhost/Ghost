var should = require('should'),
    sinon = require('sinon'),
    models = require('../../../server/models'),
    common = require('../../../server/lib/common'),
    utils = require('../../utils'),

    sandbox = sinon.sandbox.create();

describe('Models: User', function () {
    before(function () {
        models.init();
    });

    describe('Permissible', function () {
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

            models.User.permissible(mockUser, 'destroy', context, {}, utils.permissions.owner, true, true).then(() => {
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

            return models.User.permissible(mockUser, 'edit', context, {}, utils.permissions.contributor, false, true).then(() => {
                should(mockUser.get.calledOnce).be.true();
            });
        });

        describe('as editor', function () {
            it('can\'t edit another editor', function (done) {
                var mockUser = getUserModel(3, 'Editor'),
                    context = {user: 2};

                models.User.permissible(mockUser, 'edit', context, {}, utils.permissions.editor, true, true).then(() => {
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

                models.User.permissible(mockUser, 'edit', context, {}, utils.permissions.editor, true, true).then(() => {
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

                return models.User.permissible(mockUser, 'edit', context, {}, utils.permissions.editor, true, true).then(() => {
                    should(mockUser.hasRole.called).be.true();
                    should(mockUser.get.calledOnce).be.true();
                });
            });

            it('can edit contributor', function () {
                var mockUser = getUserModel(3, 'Contributor'),
                    context = {user: 2};

                return models.User.permissible(mockUser, 'edit', context, {}, utils.permissions.editor, true, true).then(() => {
                    should(mockUser.hasRole.called).be.true();
                    should(mockUser.get.calledOnce).be.true();
                });
            });

            it('can destroy self', function () {
                var mockUser = getUserModel(3, 'Editor'),
                    context = {user: 3};

                return models.User.permissible(mockUser, 'destroy', context, {}, utils.permissions.editor, true, true).then(() => {
                    should(mockUser.hasRole.called).be.true();
                    should(mockUser.get.calledOnce).be.true();
                });
            });

            it('can\'t destroy another editor', function (done) {
                var mockUser = getUserModel(3, 'Editor'),
                    context = {user: 2};

                models.User.permissible(mockUser, 'destroy', context, {}, utils.permissions.editor, true, true).then(() => {
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

                models.User.permissible(mockUser, 'destroy', context, {}, utils.permissions.editor, true, true).then(() => {
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

                return models.User.permissible(mockUser, 'destroy', context, {}, utils.permissions.editor, true, true).then(() => {
                    should(mockUser.hasRole.called).be.true();
                    should(mockUser.get.calledOnce).be.true();
                });
            });

            it('can destroy a contributor', function () {
                var mockUser = getUserModel(3, 'Contributor'),
                    context = {user: 2};

                return models.User.permissible(mockUser, 'destroy', context, {}, utils.permissions.editor, true, true).then(() => {
                    should(mockUser.hasRole.called).be.true();
                    should(mockUser.get.calledOnce).be.true();
                });
            });
        });
    });
});
