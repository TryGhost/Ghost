/*globals describe, beforeEach, it*/
var _ = require("underscore"),
    when = require('when'),
    should = require('should'),
    sinon = require('sinon'),
    errors = require('../../shared/errorHandling'),
    helpers = require('./helpers'),
    permissions = require('../../shared/permissions'),
    Models = require('../../shared/models'),
    UserProvider = Models.User,
    PermissionsProvider = Models.Permission,
    PostProvider = Models.Post;

describe('permissions', function () {

    should.exist(permissions);

    beforeEach(function (done) {
        helpers.resetData().then(function (result) {
            return when(helpers.insertDefaultUser());
        }).then(function (results) {
            done();
        }).otherwise(errors.logAndThrowError);
    });

    // beforeEach(function (done) {
    //     helpers.resetData().then(function () { done(); }, errors.throwError);
    // });

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
        // createTestUser = function (email_address) {
        //     if (!email_address) {
        //         currTestUserId += 1;
        //         email_address = "test" + currTestPermId + "@test.com";
        //     }

        //     var newUser = {
        //         id: currTestUserId,
        //         email_address: email_address,
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

            return PermissionsProvider.add(newPerm);
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

                actionsMap.edit.should.eql(['post', 'tag', 'user', 'page']);

                actionsMap.should.equal(permissions.actionsMap);

                done();
            }, errors.throwError);
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

            return testRole.save().then(function () {
                return foundUser.roles().attach(testRole);
            });
        }).then(function () {
            return UserProvider.read({id: 1}, { withRelated: ['roles'] });
        }).then(function (updatedUser) {
            should.exist(updatedUser);

            updatedUser.related('roles').length.should.equal(existingUserRoles + 1);

            done();
        });
    });

    it('can add user permissions', function (done) {
        Models.User.read({id: 1}, { withRelated: ['permissions']}).then(function (testUser) {
            var testPermission = new Models.Permission({
                name: "test edit posts",
                action_type: 'edit',
                object_type: 'post'
            });

            testUser.related('permissions').length.should.equal(0);

            return testPermission.save().then(function () {
                return testUser.permissions().attach(testPermission);
            });
        }).then(function () {
            return Models.User.read({id: 1}, { withRelated: ['permissions']});
        }).then(function (updatedUser) {
            should.exist(updatedUser);

            updatedUser.related('permissions').length.should.equal(1);

            done();
        });
    });

    it('can add role permissions', function (done) {
        var testRole = new Models.Role({
            name: "test2",
            description: "test2 description"
        });

        testRole.save()
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

                return rolePermission.save().then(function () {
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
            });
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
            }, function () {
                done();
            });
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

                return newPerm.save().then(function () {
                    return foundUser.permissions().attach(newPerm);
                });
            })
            .then(function () {
                return Models.User.read({id: 1}, { withRelated: ['permissions']});
            })
            .then(function (updatedUser) {

                // TODO: Verify updatedUser.related('permissions') has the permission?

                var canThisResult = permissions.canThis(updatedUser);

                should.exist(canThisResult.edit);
                should.exist(canThisResult.edit.post);

                return canThisResult.edit.post(fakePost);
            })
            .then(function () {
                done();
            }, function () {
                errors.logError(new Error("Did not allow edit post with permission"));
            });
    });

    it('can use permissable function on Model to allow something', function (done) {
        var testUser,
            permissableStub = sinon.stub(PostProvider, 'permissable', function () {
                return when.resolve();
            });



        // createTestUser()
        UserProvider.browse()
            .then(function (foundUser) {
                testUser = foundUser.models[0];

                return permissions.canThis(testUser).edit.post(123);
            })
            .then(function () {
                permissableStub.restore();

                permissableStub.calledWith(123, testUser.id, 'edit').should.equal(true);

                done();
            })
            .otherwise(function () {
                permissableStub.restore();
                errors.logError(new Error("Did not allow testUser"));
            });
    });

    it('can use permissable function on Model to forbid something', function (done) {
        var testUser,
            permissableStub = sinon.stub(PostProvider, 'permissable', function () {
                return when.reject();
            });


        // createTestUser()
        UserProvider.browse()
            .then(function (foundUser) {
                testUser = foundUser.models[0];


                return permissions.canThis(testUser).edit.post(123);
            })
            .then(function () {
                permissableStub.restore();

                errors.logError(new Error("Allowed testUser to edit post"));
            })
            .otherwise(function () {
                permissableStub.restore();
                permissableStub.calledWith(123, testUser.id, 'edit').should.equal(true);

                done();
            });
    });
});