var should = require('should'),
    sinon = require('sinon'),
    testUtils = require('../../utils'),
    Promise = require('bluebird'),
    _ = require('lodash'),
    models = require('../../../server/models'),
    permissions = require('../../../server/permissions'),

    sandbox = sinon.sandbox.create();

describe('Permissions', function () {
    var fakePermissions = [],
        findPostSpy,
        findTagSpy;

    before(function () {
        models.init();
    });

    beforeEach(function () {
        sandbox.stub(models.Permission, 'findAll', function () {
            return Promise.resolve(models.Permissions.forge(fakePermissions));
        });

        findPostSpy = sandbox.stub(models.Post, 'findOne', function () {
            return Promise.resolve(models.Posts.forge(testUtils.DataGenerator.Content.posts[0]));
        });

        findTagSpy = sandbox.stub(models.Tag, 'findOne', function () {
            return Promise.resolve({});
        });
    });

    afterEach(function () {
        sandbox.restore();
    });

    /**
     * Default test actionMap looks like this:
     * {
     *   browse: [ 'post' ],
     *   edit: [ 'post', 'tag', 'user', 'page' ],
     *   add: [ 'post', 'user', 'page' ],
     *   destroy: [ 'post', 'user' ]
     * }
     *
     * @param {object} options
     * @return {Array|*}
     */
    function loadFakePermissions(options) {
        options = options || {};

        var fixturePermissions = testUtils.DataGenerator.Content.permissions,
            extraPerm = {
                name: 'test',
                action_type: 'edit',
                object_type: 'post'
            };

        if (options.extra) {
            fixturePermissions.push(extraPerm);
        }

        return _.map(fixturePermissions, function (testPerm) {
            return testUtils.DataGenerator.forKnex.createPermission(testPerm);
        });
    }

    describe('No init (no action map)', function () {
        it('throws an error without init', function () {
            permissions.canThis.should.throw(/No actions map found/);
        });
    });

    describe('Init (build actions map)', function () {
        it('can load an actions map from existing permissions', function (done) {
            fakePermissions = loadFakePermissions();

            permissions.init().then(function (actionsMap) {
                should.exist(actionsMap);

                _.keys(actionsMap).should.eql(['browse', 'edit', 'add', 'destroy']);

                actionsMap.browse.should.eql(['post']);
                actionsMap.edit.should.eql(['post', 'tag', 'user', 'page']);
                actionsMap.add.should.eql(['post', 'user', 'page']);
                actionsMap.destroy.should.eql(['post', 'user']);

                actionsMap.should.equal(permissions.actionsMap);

                done();
            }).catch(done);
        });

        it('can load an actions map from existing permissions, and deduplicate', function (done) {
            fakePermissions = loadFakePermissions({extra: true});

            permissions.init().then(function (actionsMap) {
                should.exist(actionsMap);

                _.keys(actionsMap).should.eql(['browse', 'edit', 'add', 'destroy']);

                actionsMap.browse.should.eql(['post']);
                actionsMap.edit.should.eql(['post', 'tag', 'user', 'page']);
                actionsMap.add.should.eql(['post', 'user', 'page']);
                actionsMap.destroy.should.eql(['post', 'user']);

                actionsMap.should.equal(permissions.actionsMap);

                done();
            }).catch(done);
        });
    });

    describe('CanThis', function () {
        beforeEach(function () {
            fakePermissions = loadFakePermissions();

            return permissions.init();
        });

        it('canThisResult gets build properly', function () {
            var canThisResult = permissions.canThis();

            canThisResult.browse.should.be.an.Object();
            canThisResult.browse.post.should.be.a.Function();

            canThisResult.edit.should.be.an.Object();
            canThisResult.edit.post.should.be.a.Function();
            canThisResult.edit.tag.should.be.a.Function();
            canThisResult.edit.user.should.be.a.Function();
            canThisResult.edit.page.should.be.a.Function();

            canThisResult.add.should.be.an.Object();
            canThisResult.add.post.should.be.a.Function();
            canThisResult.add.user.should.be.a.Function();
            canThisResult.add.page.should.be.a.Function();

            canThisResult.destroy.should.be.an.Object();
            canThisResult.destroy.post.should.be.a.Function();
            canThisResult.destroy.user.should.be.a.Function();
        });

        describe('Non user/app permissions', function () {
            // TODO change to using fake models in tests!
            // Permissions need to be NOT fundamentally baked into Ghost, but a separate module, at some point
            // It can depend on bookshelf, but should NOT use hard coded model knowledge.
            describe('with permissible calls (post model)', function () {
                it('No context: does not allow edit post (no model)', function (done) {
                    permissions
                        .canThis() // no context
                        .edit
                        .post() // post id
                        .then(function () {
                            done(new Error('was able to edit post without permission'));
                        })
                        .catch(function (err) {
                            err.errorType.should.eql('NoPermissionError');

                            findPostSpy.callCount.should.eql(0);
                            done();
                        });
                });

                it('No context: does not allow edit post (model syntax)', function (done) {
                    permissions
                        .canThis() // no context
                        .edit
                        .post({id: 1}) // post id in model syntax
                        .then(function () {
                            done(new Error('was able to edit post without permission'));
                        })
                        .catch(function (err) {
                            err.errorType.should.eql('NoPermissionError');

                            findPostSpy.callCount.should.eql(1);
                            findPostSpy.firstCall.args[0].should.eql({id: 1, status: 'all'});
                            done();
                        });
                });

                it('No context: does not allow edit post (model ID syntax)', function (done) {
                    permissions
                        .canThis({}) // no context
                        .edit
                        .post(1) // post id using number syntax
                        .then(function () {
                            done(new Error('was able to edit post without permission'));
                        })
                        .catch(function (err) {
                            err.errorType.should.eql('NoPermissionError');

                            findPostSpy.callCount.should.eql(1);
                            findPostSpy.firstCall.args[0].should.eql({id: 1, status: 'all'});
                            done();
                        });
                });

                it('Internal context: instantly grants permissions', function (done) {
                    permissions
                        .canThis({internal: true}) // internal context
                        .edit
                        .post({id: 1}) // post id
                        .then(function () {
                            // We don't get this far, permissions are instantly granted for internal
                            findPostSpy.callCount.should.eql(0);
                            done();
                        })
                        .catch(function () {
                            done(new Error('Should allow editing post with { internal: true }'));
                        });
                });

                it('External context: does not grant permissions', function (done) {
                    permissions
                        .canThis({external: true}) // internal context
                        .edit
                        .post({id: 1}) // post id
                        .then(function () {
                            done(new Error('was able to edit post without permission'));
                        })
                        .catch(function (err) {
                            err.errorType.should.eql('NoPermissionError');

                            findPostSpy.callCount.should.eql(1);
                            findPostSpy.firstCall.args[0].should.eql({id: 1, status: 'all'});
                            done();
                        });
                });
            });

            describe('without permissible (tag model)', function () {
                it('No context: does not allow edit tag (model syntax)', function (done) {
                    permissions
                        .canThis() // no context
                        .edit
                        .tag({id: 1}) // tag id in model syntax
                        .then(function () {
                            done(new Error('was able to edit tag without permission'));
                        })
                        .catch(function (err) {
                            err.errorType.should.eql('NoPermissionError');

                            // We don't look up tags
                            findTagSpy.callCount.should.eql(0);
                            done();
                        });
                });

                it('Internal context: instantly grants permissions', function (done) {
                    permissions
                        .canThis({internal: true}) // internal context
                        .edit
                        .tag({id: 1}) // tag id
                        .then(function () {
                            // We don't look up tags
                            findTagSpy.callCount.should.eql(0);
                            done();
                        })
                        .catch(function () {
                            done(new Error('Should allow editing post with { internal: true }'));
                        });
                });

                it('External context: does not grant permissions', function (done) {
                    permissions
                        .canThis({external: true}) // internal context
                        .edit
                        .tag({id: 1}) // tag id
                        .then(function () {
                            done(new Error('was able to edit tag without permission'));
                        })
                        .catch(function (err) {
                            err.errorType.should.eql('NoPermissionError');

                            findTagSpy.callCount.should.eql(0);
                            done();
                        });
                });
            });
        });
    });

    // @TODO: move to integrations or stub
    // it('allows edit post with permission', function (done) {
    //    var fakePost = {
    //        id: '1'
    //    };

    //    permissions.init()
    //        .then(function () {
    //            return Models.User.findOne({id: 1});
    //        })
    //        .then(function (foundUser) {
    //            var newPerm = new Models.Permission({
    //                name: 'test3 edit post',
    //                action_type: 'edit',
    //                object_type: 'post'
    //            });

    //            return newPerm.save(null, context).then(function () {
    //                return foundUser.permissions().attach(newPerm);
    //            });
    //        })
    //        .then(function () {
    //            return Models.User.findOne({id: 1}, { withRelated: ['permissions']});
    //        })
    //        .then(function (updatedUser) {

    //            // TODO: Verify updatedUser.related('permissions') has the permission?
    //            var canThisResult = permissions.canThis(updatedUser.id);

    //            should.exist(canThisResult.edit);
    //            should.exist(canThisResult.edit.post);

    //            return canThisResult.edit.post(fakePost);
    //        })
    //        .then(function () {
    //            done();
    //        }).catch(done);
    // });

    // it('can use permissible function on Model to allow something', function (done) {
    //    var testUser,
    //        permissibleStub = sandbox.stub(Models.Post, 'permissible', function () {
    //            return Promise.resolve();
    //        });

    //    testUtils.insertAuthorUser()
    //        .then(function () {
    //            return Models.User.findAll();
    //        })
    //        .then(function (foundUser) {
    //            testUser = foundUser.models[1];

    //            return permissions.canThis({user: testUser.id}).edit.post(123);
    //        })
    //        .then(function () {
    //            permissibleStub.restore();
    //            permissibleStub.calledWith(123, { user: testUser.id, app: null, internal: false })
    //                .should.equal(true);

    //            done();
    //        })
    //        .catch(function () {
    //            permissibleStub.restore();

    //            done(new Error('did not allow testUser'));
    //        });
    // });

    // it('can use permissible function on Model to forbid something', function (done) {
    //    var testUser,
    //        permissibleStub = sandbox.stub(Models.Post, 'permissible', function () {
    //            return Promise.reject();
    //        });

    //    testUtils.insertAuthorUser()
    //        .then(function () {
    //            return Models.User.findAll();
    //        })
    //        .then(function (foundUser) {
    //            testUser = foundUser.models[1];

    //            return permissions.canThis({user: testUser.id}).edit.post(123);
    //        })
    //        .then(function () {

    //            permissibleStub.restore();
    //            done(new Error('Allowed testUser to edit post'));
    //        })
    //        .catch(function () {
    //            permissibleStub.calledWith(123, { user: testUser.id, app: null, internal: false })
    //                .should.equal(true);
    //            permissibleStub.restore();
    //            done();
    //        });
    // });

    // it('can get effective user permissions', function (done) {
    //    effectivePerms.user(1).then(function (effectivePermissions) {
    //        should.exist(effectivePermissions);

    //        effectivePermissions.length.should.be.above(0);

    //        done();
    //    }).catch(done);
    // });

    // it('can check an apps effective permissions', function (done) {
    //    effectivePerms.app('Kudos')
    //        .then(function (effectivePermissions) {
    //            should.exist(effectivePermissions);

    //            effectivePermissions.length.should.be.above(0);

    //            done();
    //        })
    //        .catch(done);
    // });

    // it('does not allow an app to edit a post without permission', function (done) {
    //    // Change the author of the post so the author override doesn't affect the test
    //    Models.Post.edit({'author_id': 2}, _.extend(context, {id: 1}))
    //        .then(function (updatedPost) {
    //            // Add user permissions
    //            return Models.User.findOne({id: 1})
    //                .then(function (foundUser) {
    //                    var newPerm = new Models.Permission({
    //                        name: 'app test edit post',
    //                        action_type: 'edit',
    //                        object_type: 'post'
    //                    });

    //                    return newPerm.save(null, context).then(function () {
    //                        return foundUser.permissions().attach(newPerm).then(function () {
    //                            return Promise.all([updatedPost, foundUser]);
    //                        });
    //                    });
    //                });
    //        })
    //        .then(function (results) {
    //            var updatedPost = results[0],
    //                updatedUser = results[1];

    //            return permissions.canThis({ user: updatedUser.id })
    //                .edit
    //                .post(updatedPost.id)
    //                .then(function () {
    //                    return results;
    //                })
    //                .catch(function (err) {
    //                    /*jshint unused:false */
    //                    done(new Error('Did not allow user 1 to edit post 1'));
    //                });
    //        })
    //        .then(function (results) {
    //            var updatedPost = results[0],
    //                updatedUser = results[1];

    //            // Confirm app cannot edit it.
    //            return permissions.canThis({ app: 'Hemingway', user: updatedUser.id })
    //                .edit
    //                .post(updatedPost.id)
    //                .then(function () {
    //                    done(new Error('Allowed an edit of post 1'));
    //                }).catch(done);
    //        }).catch(done);
    // });

    // it('allows an app to edit a post with permission', function (done) {
    //    permissions.canThis({ app: 'Kudos', user: 1 })
    //        .edit
    //        .post(1)
    //        .then(function () {
    //            done();
    //        })
    //        .catch(function () {
    //            done(new Error('Did not allow an edit of post 1'));
    //        });
    // });
});
