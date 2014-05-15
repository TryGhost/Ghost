/*globals describe, it, before, beforeEach, afterEach */
var testUtils = require('../../utils'),
    should = require('should'),
    errors = require('../../../server/errors'),

    // Stuff we are testing
    Models = require('../../../server/models');

describe('Permission Model', function () {

    var PermissionModel = Models.Permission;

    should.exist(PermissionModel);

    before(function (done) {
        testUtils.clearData().then(function () {
            done();
        }).catch(done);
    });

    beforeEach(function (done) {
        testUtils.initData().then(function () {
            done();
        }).catch(done);
    });

    afterEach(function (done) {
        testUtils.clearData().then(function () {
            done();
        }).catch(done);
    });

    it('can findAll', function (done) {
        PermissionModel.findAll().then(function (foundPermissions) {
            should.exist(foundPermissions);

            foundPermissions.models.length.should.be.above(0);

            done();
        }).then(null, done);
    });

    it('can findOne', function (done) {
        PermissionModel.findOne({id: 1}).then(function (foundPermission) {
            should.exist(foundPermission);

            done();
        }).catch(done);
    });

    it('can edit', function (done) {
        PermissionModel.findOne({id: 1}).then(function (foundPermission) {
            should.exist(foundPermission);

            return foundPermission.set({name: "updated"}).save();
        }).then(function () {
            return PermissionModel.findOne({id: 1});
        }).then(function (updatedPermission) {
            should.exist(updatedPermission);

            updatedPermission.get("name").should.equal("updated");

            done();
        }).catch(done);
    });

    it('can add', function (done) {
        var newPerm = {
            name: 'testperm1',
            object_type: 'test',
            action_type: 'test'
        };

        PermissionModel.add(newPerm, {user: 1}).then(function (createdPerm) {
            should.exist(createdPerm);

            createdPerm.attributes.name.should.equal(newPerm.name);

            done();
        }).catch(done);
    });

    it('can destroy', function (done) {
        var firstPermission = {id: 1};

        PermissionModel.findOne(firstPermission).then(function (foundPermission) {
            should.exist(foundPermission);
            foundPermission.attributes.id.should.equal(firstPermission.id);

            return PermissionModel.destroy(firstPermission);
        }).then(function (response) {
            response.toJSON().should.be.empty;
            return PermissionModel.findOne(firstPermission);
        }).then(function (newResults) {
            should.equal(newResults, null);

            done();
        }).catch(done);
    });
});
