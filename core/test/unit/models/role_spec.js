const models = require('../../../server/models');
const {NoPermissionError} = require('../../../server/lib/common/errors');
const ghostBookshelf = require('../../../server/models/base');
const testUtils = require('../../utils');
const should = require('should');

describe('Unit: models/role', function () {
    before(testUtils.teardown);
    before(testUtils.setup('roles', 'perms:role'));

    describe('destroy', function () {
        it('cleans up permissions join table', function () {
            const adminRole = {id: testUtils.DataGenerator.Content.roles[0].id};

            function checkRolePermissionsCount(count) {
                return ghostBookshelf.knex.select().table('permissions_roles').where('role_id', adminRole.id)
                    .then((rolePermissions) => {
                        rolePermissions.length.should.eql(count);
                    });
            }

            return models.Role.findOne(adminRole)
                .then(role => should.exist(role, 'Administrator role not found'))
                .then(() => checkRolePermissionsCount(2))
                .then(() => models.Role.destroy(adminRole))
                .then(() => checkRolePermissionsCount(0));
        });
    });

    describe('permissible', function () {
        it('does not let api key assign the owner role', function () {
            return models.Role.permissible(
                models.Role.forge({name: 'Owner'}), // Owner role
                'assign',                           // assign action
                {},
                {},
                {apiKey: {}},                       // apiKey loaded permissions
                true,
                true,
                true
            ).then(() => {
                throw new Error('models.Role.permissible should have thrown!');
            }, (err) => {
                should.equal(err instanceof NoPermissionError, true);
            });
        });
    });
});
