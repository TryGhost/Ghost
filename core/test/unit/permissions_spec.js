/*globals describe, before, beforeEach, afterEach, it*/
var testUtils = require('../utils'),
    should = require('should'),
    sinon = require('sinon'),
    when = require('when'),
    _ = require("lodash"),
    errors = require('../../server/errorHandling'),

    // Stuff we are testing
    permissions = require('../../server/permissions'),
    effectivePerms = require('../../server/permissions/effective'),
    Models = require('../../server/models'),
    UserProvider = Models.User,
    PermissionsProvider = Models.Permission,
    PostProvider = Models.Post;

describe('Permissions', function () {

    var sandbox;

    before(function (done) {
        testUtils.clearData().then(function () {
                done();
            }, done);
    });

    beforeEach(function (done) {
        sandbox = sinon.sandbox.create();
        testUtils.initData()
            .then(testUtils.insertDefaultUser)
            .then(testUtils.insertDefaultApp)
            .then(function () {
                done();
            }, done);
    });

    afterEach(function (done) {
        sandbox.restore();
        testUtils.clearData()
            .then(function () {
                done();
            }, done);
    });

    after(function (done) {
        testUtils.clearData().then(function () {
            done();
        }, done);
    });

    var testPerms = [
            { act: "edit", obj: "post" },
            { act: "edit", obj: "tag" },
            { act: "edit", obj: "user" },
            { act: "edit", obj: "page" },
            { act: "add", obj: "post" },
            { act: "add", obj: "user" },
            { act: "add", obj: "page" },
            { act: "remove", obj: "post" },
            { act: "remove", obj: "user" }
        ],
        currTestPermId = 1,
        // currTestUserId = 1,
        // createTestUser = function (email) {
        //     if (!email) {
        //         currTestUserId += 1;
        //         email = "test" + currTestPermId + "@test.com";
        //     }

        //     var newUser = {
        //         id: currTestUserId,
        //         email: email,
        //         password: "testing123"
        //     };

        //     return UserProvider.add(newUser);
        // },
        createPermission = function (name, act, obj) {
            if (!name) {
                currTestPermId += 1;
                name = "test" + currTestPermId;
            }

            var newPerm = {
                name: name,
                action_type: act,
                object_type: obj
            };

            return PermissionsProvider.add(newPerm, {user: 1});
        },
        createTestPermissions = function () {
            var createActions = _.map(testPerms, function (testPerm) {
                return createPermission(null, testPerm.act, testPerm.obj);
            });

            return when.all(createActions);
        };

    it('can load an actions map from existing permissions', function (done) {

        createTestPermissions()
            .then(permissions.init)
            .then(function (actionsMap) {
                should.exist(actionsMap);

                actionsMap.edit.sort().should.eql(['post', 'tag', 'user', 'page', 'setting'].sort());

                actionsMap.should.equal(permissions.actionsMap);

                done();
            }).then(null, done);
    });

    it('can add user to role', function (done) {
        var existingUserRoles;

        UserProvider.read({id: 1}, { withRelated: ['roles'] }).then(function (foundUser) {
            var testRole = new Models.Role({
                name: 'testrole1',
                description: 'testrole1 description'
            });

            should.exist(foundUser);

            should.exist(foundUser.roles());

            existingUserRoles = foundUser.related('roles').length;

            return testRole.save(null, {user: 1}).then(function () {
                return foundUser.roles().attach(testRole);
            });
        }).then(function () {
            return UserProvider.read({id: 1}, { withRelated: ['roles'] });
        }).then(function (updatedUser) {
            should.exist(updatedUser);

            updatedUser.related('roles').length.should.equal(existingUserRoles + 1);

            done();
        }).then(null, done);
    });

    it('can add user permissions', function (done) {
        Models.User.read({id: 1}, { withRelated: ['permissions']}).then(function (testUser) {
            var testPermission = new Models.Permission({
                name: "test edit posts",
                action_type: 'edit',
                object_type: 'post'
            });

            testUser.related('permissions').length.should.equal(0);

            return testPermission.save(null, {user: 1}).then(function () {
                return testUser.permissions().attach(testPermission);
            });
        }).then(function () {
            return Models.User.read({id: 1}, { withRelated: ['permissions']});
        }).then(function (updatedUser) {
            should.exist(updatedUser);

            updatedUser.related('permissions').length.should.equal(1);

            done();
        }).then(null, done);
    });

    it('can add role permissions', function (done) {
        var testRole = new Models.Role({
            name: "test2",
            description: "test2 description"
        });

        testRole.save(null, {user: 1})
            .then(function () {
                return testRole.load('permissions');
            })
            .then(function () {
                var rolePermission = new Models.Permission({
                    name: "test edit posts",
                    action_type: 'edit',
                    object_type: 'post'
                });

                testRole.related('permissions').length.should.equal(0);

                return rolePermission.save(null, {user: 1}).then(function () {
                    return testRole.permissions().attach(rolePermission);
                });
            })
            .then(function () {
                return Models.Role.read({id: testRole.id}, { withRelated: ['permissions']});
            })
            .then(function (updatedRole) {
                should.exist(updatedRole);

                updatedRole.related('permissions').length.should.equal(1);

                done();
            }).then(null, done);
    });

    it('does not allow edit post without permission', function (done) {
        var fakePage = {
                id: 1
            };

        createTestPermissions()
            .then(permissions.init)
            .then(function () {
                return Models.User.read({id: 1});
            })
            .then(function (foundUser) {
                var canThisResult = permissions.canThis(foundUser);

                should.exist(canThisResult.edit);
                should.exist(canThisResult.edit.post);

                return canThisResult.edit.page(fakePage);
            })
            .then(function () {
                errors.logError(new Error("Allowed edit post without permission"));
            }, done);
    });

    it('allows edit post with permission', function (done) {
        var fakePost = {
                id: "1"
            };

        createTestPermissions()
            .then(permissions.init)
            .then(function () {
                return Models.User.read({id: 1});
            })
            .then(function (foundUser) {
                var newPerm = new Models.Permission({
                    name: "test3 edit post",
                    action_type: "edit",
                    object_type: "post"
                });

                return newPerm.save(null, {user: 1}).then(function () {
                    return foundUser.permissions().attach(newPerm);
                });
            })
            .then(function () {
                return Models.User.read({id: 1}, { withRelated: ['permissions']});
            })
            .then(function (updatedUser) {

                // TODO: Verify updatedUser.related('permissions') has the permission?
                var canThisResult = permissions.canThis(updatedUser.id);

                should.exist(canThisResult.edit);
                should.exist(canThisResult.edit.post);

                return canThisResult.edit.post(fakePost);
            })
            .then(function () {
                done();
            }, done);
    });

    it('can use permissable function on Model to allow something', function (done) {
        var testUser,
            permissableStub = sandbox.stub(PostProvider, 'permissable', function () {
                return when.resolve();
            });

        testUtils.insertAuthorUser()
            .then(function () {
                return UserProvider.browse();
            })
            .then(function (foundUser) {
                testUser = foundUser.models[1];

                return permissions.canThis(testUser).edit.post(123);
            })
            .then(function () {
                permissableStub.restore();
                permissableStub.calledWith(123, { user: testUser.id, app: null, internal: false }).should.equal(true);

                done();
            })
            .otherwise(function () {
                permissableStub.restore();
                errors.logError(new Error("Did not allow testUser"));

                done();
            });
    });

    it('can use permissable function on Model to forbid something', function (done) {
        var testUser,
            permissableStub = sandbox.stub(PostProvider, 'permissable', function () {
                return when.reject();
            });

        testUtils.insertAuthorUser()
            .then(function () {
                return UserProvider.browse();
            })
            .then(function (foundUser) {
                testUser = foundUser.models[1];

                return permissions.canThis(testUser).edit.post(123);
            })
            .then(function () {
                permissableStub.restore();

                done(new Error("Allowed testUser to edit post"));
            })
            .otherwise(function () {
                permissableStub.restore();
                permissableStub.calledWith(123, { user: testUser.id, app: null, internal: false }).should.equal(true);
                done();
            });
    });

    it("can get effective user permissions", function (done) {
        effectivePerms.user(1).then(function (effectivePermissions) {
            should.exist(effectivePermissions);

            effectivePermissions.length.should.be.above(0);

            done();
        }).then(null, done);
    });

    it('can check an apps effective permissions', function (done) {
        effectivePerms.app('Kudos')
            .then(function (effectivePermissions) {
                should.exist(effectivePermissions);

                effectivePermissions.length.should.be.above(0);

                done();
            })
            .otherwise(done);
    });

    it('does not allow an app to edit a post without permission', function (done) {
        // Change the author of the post so the author override doesn't affect the test
        PostProvider.edit({id: 1, 'author_id': 2})
            .then(function (updatedPost) {
                // Add user permissions
                return Models.User.read({id: 1})
                    .then(function (foundUser) {
                        var newPerm = new Models.Permission({
                            name: "app test edit post",
                            action_type: "edit",
                            object_type: "post"
                        });

                        return newPerm.save(null, {user: 1}).then(function () {
                            return foundUser.permissions().attach(newPerm).then(function () {
                                return when.all([updatedPost, foundUser]);
                            });
                        });
                    });
            })
            .then(function (results) {
                var updatedPost = results[0],
                    updatedUser = results[1];

                return permissions.canThis({ user: updatedUser.id })
                    .edit
                    .post(updatedPost.id)
                    .then(function () {
                        return results;
                    })
                    .otherwise(function (err) {
                        done(new Error("Did not allow user 1 to edit post 1"));
                    });
            })
            .then(function (results) {
                var updatedPost = results[0],
                    updatedUser = results[1];

                // Confirm app cannot edit it.
                return permissions.canThis({ app: 'Hemingway', user: updatedUser.id })
                    .edit
                    .post(updatedPost.id)
                    .then(function () {
                        done(new Error("Allowed an edit of post 1"));
                    })
                    .otherwise(function () {
                        done();
                    });
            }).otherwise(done);
    });

    it('allows an app to edit a post with permission', function (done) {
        permissions.canThis({ app: 'Kudos', user: 1 })
            .edit
            .post(1)
            .then(function () {
                done();
            })
            .otherwise(function () {
                done(new Error("Allowed an edit of post 1"));
            });
    });

    it('checks for null context passed and rejects', function (done) {
        permissions.canThis(undefined)
            .edit
            .post(1)
            .then(function () {
                done(new Error("Should not allow editing post"));
            })
            .otherwise(function () {
                done();
            });
    });

    it('allows \'internal\' to be passed for internal requests', function (done) {
        // Using tag here because post implements the custom permissable interface
        permissions.canThis('internal')
            .edit
            .tag(1)
            .then(function () {
                done();
            })
            .otherwise(function () {
                done(new Error("Should allow editing post with 'internal'"));
            });
    });

    it('allows { internal: true } to be passed for internal requests', function (done) {
        // Using tag here because post implements the custom permissable interface
        permissions.canThis({ internal: true })
            .edit
            .tag(1)
            .then(function () {
                done();
            })
            .otherwise(function () {
                done(new Error("Should allow editing post with { internal: true }"));
            });
    });
});