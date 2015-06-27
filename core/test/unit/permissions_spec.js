/*globals describe, before, beforeEach, afterEach, it*/
/*jshint expr:true*/
var testUtils       = require('../utils'),
    should          = require('should'),
    sinon           = require('sinon'),
    Promise         = require('bluebird'),
    _               = require('lodash'),

    // Stuff we are testing
    Models          = require('../../server/models'),
    permissions     = require('../../server/permissions'),
//    effectivePerms  = require('../../server/permissions/effective'),
//    context         = testUtils.context.owner,

    sandbox         = sinon.sandbox.create();

describe('Permissions', function () {
    afterEach(function () {
        sandbox.restore();
    });

    describe('actions map', function () {
        before(function (done) {
            Models.init().then(done).catch(done);
        });

        beforeEach(function () {
            var permissions = _.map(testUtils.DataGenerator.Content.permissions, function (testPerm) {
                return testUtils.DataGenerator.forKnex.createPermission(testPerm);
            });

            sandbox.stub(Models.Permission, 'findAll', function () {
                return Promise.resolve(Models.Permissions.forge(permissions));
            });
        });

        it('can load an actions map from existing permissions', function (done) {
            permissions.init().then(function (actionsMap) {
                should.exist(actionsMap);

                actionsMap.edit.sort().should.eql(['post', 'tag', 'user', 'page'].sort());

                actionsMap.should.equal(permissions.actionsMap);

                done();
            }).catch(done);
        });
    });

    describe('parseContext', function () {
        it('should return public for no context', function () {
            permissions.parseContext().should.eql({
                internal: false,
                user: null,
                app: null,
                public: true
            });
            permissions.parseContext({}).should.eql({
                internal: false,
                user: null,
                app: null,
                public: true
            });
        });

        it('should return public for random context', function () {
            permissions.parseContext('public').should.eql({
                internal: false,
                user: null,
                app: null,
                public: true
            });
            permissions.parseContext({client: 'thing'}).should.eql({
                internal: false,
                user: null,
                app: null,
                public: true
            });
        });

        it('should return user if user populated', function () {
            permissions.parseContext({user: 1}).should.eql({
                internal: false,
                user: 1,
                app: null,
                public: false
            });
        });

        it('should return app if app populated', function () {
            permissions.parseContext({app: 5}).should.eql({
                internal: false,
                user: null,
                app: 5,
                public: false
            });
        });

        it('should return internal if internal provided', function () {
            permissions.parseContext({internal: true}).should.eql({
                internal: true,
                user: null,
                app: null,
                public: false
            });

            permissions.parseContext('internal').should.eql({
                internal: true,
                user: null,
                app: null,
                public: false
            });
        });
    });

    describe('applyPublicRules', function () {
        it('should return empty object for docName with no rules', function (done) {
            permissions.applyPublicRules('test', 'test', {}).then(function (result) {
                result.should.eql({});
                done();
            });
        });

        it('should return unchanged object for non-public context', function (done) {
            var internal = {context: 'internal'},
                user = {context: {user: 1}},
                app =  {context: {app: 1}};

            permissions.applyPublicRules('posts', 'browse', _.cloneDeep(internal)).then(function (result) {
                result.should.eql(internal);

                return permissions.applyPublicRules('posts', 'browse', _.cloneDeep(user));
            }).then(function (result) {
                result.should.eql(user);

                return permissions.applyPublicRules('posts', 'browse', _.cloneDeep(app));
            }).then(function (result) {
                result.should.eql(app);

                done();
            }).catch(done);
        });

        it('should return unchanged object for post with public context', function (done) {
            var public = {context: {}};

            permissions.applyPublicRules('posts', 'browse', _.cloneDeep(public)).then(function (result) {
                result.should.not.eql(public);
                result.should.eql({
                    context: {},
                    status: 'published'
                });

                return permissions.applyPublicRules('posts', 'browse', _.extend({}, _.cloneDeep(public), {status: 'published'}));
            }).then(function (result) {
                result.should.eql({
                    context: {},
                    status: 'published'
                });

                done();
            }).catch(done);
        });

        it('should throw an error for draft post without uuid (read)', function (done) {
            var draft = {context: {}, data: {status: 'draft'}};

            permissions.applyPublicRules('posts', 'read', _.cloneDeep(draft)).then(function () {
                done('Did not throw an error for draft');
            }).catch(function (err) {
                err.should.be.a.String;
                done();
            });
        });

        it('should throw an error for draft post (browse)', function (done) {
            var draft = {context: {}, status: 'draft'};

            permissions.applyPublicRules('posts', 'browse', _.cloneDeep(draft)).then(function () {
                done('Did not throw an error for draft');
            }).catch(function (err) {
                err.should.be.a.String;
                done();
            });
        });

        it('should permit post draft status with uuid (read)', function (done) {
            var draft = {context: {}, data: {status: 'draft', uuid: '1234-abcd'}};

            permissions.applyPublicRules('posts', 'read', _.cloneDeep(draft)).then(function (result) {
                result.should.eql(draft);
                done();
            }).catch(done);
        });

        it('should permit post all status with uuid (read)', function (done) {
            var draft = {context: {}, data: {status: 'all', uuid: '1234-abcd'}};

            permissions.applyPublicRules('posts', 'read', _.cloneDeep(draft)).then(function (result) {
                result.should.eql(draft);
                done();
            }).catch(done);
        });

        it('should NOT permit post draft status with uuid (browse)', function (done) {
            var draft = {context: {}, status: 'draft', uuid: '1234-abcd'};

            permissions.applyPublicRules('posts', 'browse', _.cloneDeep(draft)).then(function () {
                done('Did not throw an error for draft');
            }).catch(function (err) {
                err.should.be.a.String;
                done();
            });
        });

        it('should NOT permit post all status with uuid (browse)', function (done) {
            var draft = {context: {}, status: 'all', uuid: '1234-abcd'};

            permissions.applyPublicRules('posts', 'browse', _.cloneDeep(draft)).then(function () {
                done('Did not throw an error for draft');
            }).catch(function (err) {
                err.should.be.a.String;
                done();
            });
        });

        it('should throw an error for draft post with uuid and id or slug (read)', function (done) {
            var draft = {context: {}, data: {status: 'draft', uuid: '1234-abcd', id: 1}};

            permissions.applyPublicRules('posts', 'read', _.cloneDeep(draft)).then(function () {
                done('Did not throw an error for draft');
            }).catch(function (err) {
                err.should.be.a.String;
                draft = {context: {},  data: {status: 'draft', uuid: '1234-abcd', slug: 'abcd'}};

                return permissions.applyPublicRules('posts', 'read', _.cloneDeep(draft)).then(function () {
                    done('Did not throw an error for draft');
                }).catch(function (err) {
                    err.should.be.a.String;
                    done();
                });
            });
        });

        it('should return unchanged object for user with public context', function (done) {
            var public = {context: {}};

            permissions.applyPublicRules('users', 'browse', _.cloneDeep(public)).then(function (result) {
                result.should.not.eql(public);
                result.should.eql({
                    context: {},
                    status: 'active'
                });

                return permissions.applyPublicRules('users', 'browse', _.extend({}, _.cloneDeep(public), {status: 'active'}));
            }).then(function (result) {
                result.should.eql({
                    context: {},
                    status: 'active'
                });

                done();
            }).catch(done);
        });

        it('should throw an error for an inactive user', function (done) {
            var inactive = {context: {}, status: 'inactive'};

            permissions.applyPublicRules('users', 'browse', _.cloneDeep(inactive)).then(function () {
                done('Did not throw an error for inactive');
            }).catch(function (err) {
                err.should.be.a.String;
                done();
            });
        });
    });

    // @TODO: move to integrations or stub
    // it('does not allow edit post without permission', function (done) {
    //    var fakePage = {
    //        id: 1
    //    };

    //    permissions.init()
    //        .then(function () {
    //            var canThisResult = permissions.canThis({id: 1});

    //            should.exist(canThisResult.edit);
    //            should.exist(canThisResult.edit.post);

    //            return canThisResult.edit.page(fakePage);
    //        })
    //        .then(function () {
    //            done(new Error('was able to edit post without permission'));
    //        }).catch(done);
    // });

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

    // it('checks for null context passed and rejects', function (done) {
    //    permissions.canThis(undefined)
    //        .edit
    //        .post(1)
    //        .then(function () {
    //            done(new Error('Should not allow editing post'));
    //        })
    //        .catch(done);
    // });

    // it('allows \'internal\' to be passed for internal requests', function (done) {
    //    // Using tag here because post implements the custom permissible interface
    //    permissions.canThis('internal')
    //        .edit
    //        .tag(1)
    //        .then(function () {
    //            done();
    //        })
    //        .catch(function () {
    //            done(new Error('Should allow editing post with "internal"'));
    //        });
    // });

    // it('allows { internal: true } to be passed for internal requests', function (done) {
    //     // Using tag here because post implements the custom permissible interface
    //     permissions.canThis({internal: true})
    //        .edit
    //        .tag(1)
    //        .then(function () {
    //            done();
    //        })
    //        .catch(function () {
    //            done(new Error('Should allow editing post with { internal: true }'));
    //        });
    // });
});
