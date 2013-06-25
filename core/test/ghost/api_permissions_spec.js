/*globals describe, it, beforeEach */
var should = require('should'),
    helpers = require('./helpers'),
    errors = require('../../shared/errorHandling'),
    Models = require('../../shared/models');

describe("Role Model", function () {

    var RoleModel = Models.Role;

    should.exist(RoleModel);

    beforeEach(function (done) {
        helpers.resetData().then(function () {
            done();
        }, done);
    });

    it("can browse roles", function (done) {
        RoleModel.browse().then(function (foundRoles) {
            should.exist(foundRoles);

            foundRoles.models.length.should.be.above(0);

            done();
        }, errors.logError);
    });

    it("can read roles", function (done) {
        RoleModel.read({id: 1}).then(function (foundRole) {
            should.exist(foundRole);

            done();
        }, errors.logError);
    });

    it("can edit roles", function (done) {
        RoleModel.read({id: 1}).then(function (foundRole) {
            should.exist(foundRole);

            return foundRole.set({name: "updated"}).save();
        }).then(function () {
            return RoleModel.read({id: 1});
        }).then(function (updatedRole) {
            should.exist(updatedRole);

            updatedRole.get("name").should.equal("updated");

            done();
        }, errors.logError);
    });

    it("can add roles", function (done) {
        var newRole = {
            name: "test1",
            description: "test1 description"
        };

        RoleModel.add(newRole).then(function (createdRole) {
            should.exist(createdRole);

            createdRole.attributes.name.should.equal(newRole.name);
            createdRole.attributes.description.should.equal(newRole.description);

            done();
        }, done);
    });

    it("can delete roles", function (done) {
        RoleModel.read({id: 1}).then(function (foundRole) {
            should.exist(foundRole);

            return RoleModel['delete'](1);
        }).then(function () {
            return RoleModel.browse();
        }).then(function (foundRoles) {
            var hasRemovedId = foundRoles.any(function (role) {
                return role.id === 1;
            });

            hasRemovedId.should.equal(false);

            done();
        }, errors.logError);
    });
});

describe("Permission Model", function () {

    var PermissionModel = Models.Permission;

    should.exist(PermissionModel);

    beforeEach(function (done) {
        helpers.resetData().then(function () {
            done();
        }, done);
    });

    it("can browse permissions", function (done) {
        PermissionModel.browse().then(function (foundPermissions) {
            should.exist(foundPermissions);

            foundPermissions.models.length.should.be.above(0);

            done();
        }, errors.logError);
    });

    it("can read permissions", function (done) {
        PermissionModel.read({id: 1}).then(function (foundPermission) {
            should.exist(foundPermission);

            done();
        }, errors.logError);
    });

    it("can edit permissions", function (done) {
        PermissionModel.read({id: 1}).then(function (foundPermission) {
            should.exist(foundPermission);

            return foundPermission.set({name: "updated"}).save();
        }).then(function () {
            return PermissionModel.read({id: 1});
        }).then(function (updatedPermission) {
            should.exist(updatedPermission);

            updatedPermission.get("name").should.equal("updated");

            done();
        }, errors.logError);
    });

    it("can add permissions", function (done) {
        var newPerm = {
            name: "testperm1"
        };

        PermissionModel.add(newPerm).then(function (createdPerm) {
            should.exist(createdPerm);

            createdPerm.attributes.name.should.equal(newPerm.name);

            done();
        }, done);
    });

    it("can delete permissions", function (done) {
        PermissionModel.read({id: 1}).then(function (foundPermission) {
            should.exist(foundPermission);

            return PermissionModel['delete'](1);
        }).then(function () {
            return PermissionModel.browse();
        }).then(function (foundPermissions) {
            var hasRemovedId = foundPermissions.any(function (permission) {
                return permission.id === 1;
            });

            hasRemovedId.should.equal(false);

            done();
        }, errors.logError);
    });
});