/*globals describe, it, before, beforeEach, afterEach */
var testUtils   = require('../../utils'),
    should      = require('should'),

    // Stuff we are testing
    RoleModel   = require('../../../server/models/role').Role,
    context     = testUtils.context.admin;

describe('Role Model', function () {
    // Keep the DB clean
    before(testUtils.teardown);
    afterEach(testUtils.teardown);

    beforeEach(testUtils.setup('role'));

    before(function () {
        should.exist(RoleModel);
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
            foundRole.get('created_at').should.be.an.instanceof(Date);

            done();
        }).catch(done);
    });

    it('can edit', function (done) {
        RoleModel.findOne({id: 1}).then(function (foundRole) {
            should.exist(foundRole);

            return foundRole.set({name: 'updated'}).save(null, context);
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

        RoleModel.add(newRole, context).then(function (createdRole) {
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
            response.toJSON().should.be.empty();
            return RoleModel.findOne(firstRole);
        }).then(function (newResults) {
            should.equal(newResults, null);

            done();
        }).catch(done);
    });
});
