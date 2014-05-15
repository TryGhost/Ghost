/*globals describe, it, before, beforeEach, afterEach */
var testUtils = require('../../utils'),
    should = require('should'),

    // Stuff we are testing
    Models = require('../../../server/models');

describe('Role Model', function () {

    var RoleModel = Models.Role;

    should.exist(RoleModel);

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
        RoleModel.findAll().then(function (foundRoles) {
            should.exist(foundRoles);

            foundRoles.models.length.should.be.above(0);

            done();
        }).catch(done);
    });

    it('can findOne', function (done) {
        RoleModel.findOne({id: 1}).then(function (foundRole) {
            should.exist(foundRole);

            done();
        }).catch(done);
    });

    it('can edit', function (done) {
        RoleModel.findOne({id: 1}).then(function (foundRole) {
            should.exist(foundRole);

            return foundRole.set({name: 'updated'}).save();
        }).then(function () {
            return RoleModel.findOne({id: 1});
        }).then(function (updatedRole) {
            should.exist(updatedRole);

            updatedRole.get('name').should.equal('updated');

            done();
        }).catch(done);
    });

    it('can add', function (done) {
        var newRole = {
            name: 'test1',
            description: 'test1 description'
        };

        RoleModel.add(newRole, {user: 1}).then(function (createdRole) {
            should.exist(createdRole);

            createdRole.attributes.name.should.equal(newRole.name);
            createdRole.attributes.description.should.equal(newRole.description);

            done();
        }).catch(done);
    });

    it('can destroy', function (done) {
        var firstRole = {id: 1};

        RoleModel.findOne(firstRole).then(function (foundRole) {
            should.exist(foundRole);
            foundRole.attributes.id.should.equal(firstRole.id);

            return RoleModel.destroy(firstRole);
        }).then(function (response) {
            response.toJSON().should.be.empty;
            return  RoleModel.findOne(firstRole);
        }).then(function (newResults) {
            should.equal(newResults, null);

            done();
        }).catch(done);
    });
});
