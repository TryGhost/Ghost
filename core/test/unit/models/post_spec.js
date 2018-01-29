var should = require('should'), // jshint ignore:line
    sinon = require('sinon'),
    models = require('../../../server/models'),
    common = require('../../../server/lib/common'),

    sandbox = sinon.sandbox.create();

describe('Models: Post', function () {
    before(function () {
        models.init();
    });

    describe('Permissible', function () {
        var author = {user: {roles: [{name: 'Author'}]}};

        describe('As Contributor', function () {
            var contributor = {user: {roles: [{name: 'Contributor'}]}};

            it('rejects if editing, changing status', function (done) {
                var mockPostObj = {
                        get: sandbox.stub()
                    },
                    context = {user: 1},
                    unsafeAttrs = {status: 'published'};

                mockPostObj.get.withArgs('status').returns('draft');
                mockPostObj.get.withArgs('author_id').returns(1);

                models.Post.permissible(mockPostObj, 'edit', context, unsafeAttrs, contributor, false, false).then(() => {
                    done(new Error('Permissible function should have rejected.'));
                }).catch((error) => {
                    error.should.be.an.instanceof(common.errors.NoPermissionError);
                    should(mockPostObj.get.calledOnce).be.true();
                    done();
                });
            });

            it('rejects if editing, changing author id', function (done) {
                var mockPostObj = {
                        get: sandbox.stub()
                    },
                    context = {user: 1},
                    unsafeAttrs = {status: 'draft', author_id: 2};

                mockPostObj.get.withArgs('status').returns('draft');
                mockPostObj.get.withArgs('author_id').returns(1);

                models.Post.permissible(mockPostObj, 'edit', context, unsafeAttrs, contributor, false, false).then(() => {
                    done(new Error('Permissible function should have rejected.'));
                }).catch((error) => {
                    error.should.be.an.instanceof(common.errors.NoPermissionError);
                    should(mockPostObj.get.calledTwice).be.true();
                    done();
                });
            });

            it('rejects if editing & post is not draft', function (done) {
                var mockPostObj = {
                        get: sandbox.stub()
                    },
                    context = {user: 1},
                    unsafeAttrs = {status: 'published', author_id: 1};

                mockPostObj.get.withArgs('status').returns('published');
                mockPostObj.get.withArgs('author_id').returns(1);

                models.Post.permissible(mockPostObj, 'edit', context, unsafeAttrs, contributor, false, false).then(() => {
                    done(new Error('Permissible function should have rejected.'));
                }).catch((error) => {
                    error.should.be.an.instanceof(common.errors.NoPermissionError);
                    should(mockPostObj.get.calledThrice).be.true();
                    done();
                });
            });

            it('rejects if editing & contributor is not author of post', function (done) {
                var mockPostObj = {
                        get: sandbox.stub()
                    },
                    context = {user: 1},
                    unsafeAttrs = {status: 'draft', author_id: 2};

                mockPostObj.get.withArgs('status').returns('draft');
                mockPostObj.get.withArgs('author_id').returns(2);

                models.Post.permissible(mockPostObj, 'edit', context, unsafeAttrs, contributor, false, false).then(() => {
                    done(new Error('Permissible function should have rejected.'));
                }).catch((error) => {
                    error.should.be.an.instanceof(common.errors.NoPermissionError);
                    should(mockPostObj.get.callCount).eql(4);
                    done();
                });
            });

            it('rejects if adding with "published" status', function (done) {
                var mockPostObj = {
                        get: sandbox.stub()
                    },
                    context = {user: 1},
                    unsafeAttrs = {status: 'published', author_id: 1};

                models.Post.permissible(mockPostObj, 'add', context, unsafeAttrs, contributor, false, false).then(() => {
                    done(new Error('Permissible function should have rejected.'));
                }).catch((error) => {
                    error.should.be.an.instanceof(common.errors.NoPermissionError);
                    should(mockPostObj.get.called).be.false();
                    done();
                });
            });

            it('rejects if adding with a different author id', function (done) {
                var mockPostObj = {
                        get: sandbox.stub()
                    },
                    context = {user: 1},
                    unsafeAttrs = {status: 'draft', author_id: 2};

                models.Post.permissible(mockPostObj, 'add', context, unsafeAttrs, contributor, false, false).then(() => {
                    done(new Error('Permissible function should have rejected.'));
                }).catch((error) => {
                    error.should.be.an.instanceof(common.errors.NoPermissionError);
                    should(mockPostObj.get.called).be.false();
                    done();
                });
            });

            it('rejects if destroying another author\'s post', function (done) {
                var mockPostObj = {
                        get: sandbox.stub()
                    },
                    context = {user: 1};

                mockPostObj.get.withArgs('author_id').returns(2);

                models.Post.permissible(mockPostObj, 'destroy', context, {}, contributor, false, false).then(() => {
                    done(new Error('Permissible function should have rejected.'));
                }).catch((error) => {
                    error.should.be.an.instanceof(common.errors.NoPermissionError);
                    should(mockPostObj.get.calledOnce).be.true();
                    done();
                });
            });
        });
    });
});
