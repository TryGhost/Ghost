/*globals describe, it, before, beforeEach, afterEach */
var testUtils = require('./testUtils'),
    should = require('should'),
    errors = require('../../server/errorHandling'),

    // Stuff we are testing
    Models = require('../../server/models');

describe("Role Model", function () {

    var RoleModel = Models.Role;

    should.exist(RoleModel);

    before(function (done) {
        testUtils.clearData().then(function () {
            done();
        }, done);
    });

    beforeEach(function (done) {
        testUtils.initData().then(function () {
            done();
        }, done);
    });

    afterEach(function (done) {
        testUtils.clearData().then(function () {
            done();
        }, done);
    });

    it("can browse roles", function (done) {
        RoleModel.browse().then(function (foundRoles) {
            should.exist(foundRoles);

            foundRoles.models.length.should.be.above(0);

            done();
        }).then(null, done);
    });

    it("can read roles", function (done) {
        RoleModel.read({id: 1}).then(function (foundRole) {
            should.exist(foundRole);

            done();
        }).then(null, done);
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
        }).then(null, done);
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
        }).then(null, done);
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
        }).then(null, done);
    });
});