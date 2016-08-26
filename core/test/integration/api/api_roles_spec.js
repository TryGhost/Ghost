var testUtils   = require('../../utils'),
    should      = require('should'),
    _           = require('lodash'),
    RoleAPI     = require('../../../server/api/roles'),
    context     = testUtils.context;

describe('Roles API', function () {
    // Keep the DB clean
    before(testUtils.teardown);
    afterEach(testUtils.teardown);
    beforeEach(testUtils.setup('users:roles', 'perms:role', 'perms:init'));

    describe('Browse', function () {
        function checkBrowseResponse(response) {
            should.exist(response);
            testUtils.API.checkResponse(response, 'roles');
            should.exist(response.roles);
            response.roles.should.have.length(4);
            testUtils.API.checkResponse(response.roles[0], 'role');
            testUtils.API.checkResponse(response.roles[1], 'role');
            testUtils.API.checkResponse(response.roles[2], 'role');
            testUtils.API.checkResponse(response.roles[3], 'role');
        }

        it('Owner can browse', function () {
            return RoleAPI.browse(context.owner).then(function (response) {
                checkBrowseResponse(response);
            });
        });

        it('Admin can browse', function () {
            return RoleAPI.browse(context.admin).then(function (response) {
                checkBrowseResponse(response);
            });
        });

        it('Editor can browse', function () {
            return RoleAPI.browse(context.editor).then(function (response) {
                checkBrowseResponse(response);
            });
        });

        it('Author can browse', function () {
            return RoleAPI.browse(context.author).then(function (response) {
                checkBrowseResponse(response);
            });
        });

        it('No-auth CANNOT browse', function () {
            return RoleAPI.browse().then(function () {
                throw new Error('Browse roles is not denied without authentication.');
            });
        });
    });

    describe('Browse permissions=assign', function () {
        function checkBrowseResponse(response) {
            should.exist(response);
            should.exist(response.roles);
            testUtils.API.checkResponse(response, 'roles');
            response.roles.should.have.length(3);
            testUtils.API.checkResponse(response.roles[0], 'role');
            testUtils.API.checkResponse(response.roles[1], 'role');
            testUtils.API.checkResponse(response.roles[2], 'role');
            response.roles[0].name.should.equal('Administrator');
            response.roles[1].name.should.equal('Editor');
            response.roles[2].name.should.equal('Author');
        }

        it('Owner can assign all', function () {
            return RoleAPI.browse(_.extend({}, context.owner, {permissions: 'assign'})).then(function (response) {
                checkBrowseResponse(response);
            });
        });

        it('Admin can assign all', function () {
            return RoleAPI.browse(_.extend({}, context.admin, {permissions: 'assign'})).then(function (response) {
                checkBrowseResponse(response);
            });
        });

        it('Editor can assign Author', function () {
            return RoleAPI.browse(_.extend({}, context.editor, {permissions: 'assign'})).then(function (response) {
                should.exist(response);
                should.exist(response.roles);
                testUtils.API.checkResponse(response, 'roles');
                response.roles.should.have.length(1);
                testUtils.API.checkResponse(response.roles[0], 'role');
                response.roles[0].name.should.equal('Author');
            });
        });

        it('Author CANNOT assign any', function () {
            return RoleAPI.browse(_.extend({}, context.author, {permissions: 'assign'})).then(function (response) {
                should.exist(response);
                should.exist(response.roles);
                testUtils.API.checkResponse(response, 'roles');
                response.roles.should.have.length(0);
            });
        });

        it('No-auth CANNOT browse', function () {
            return RoleAPI.browse({permissions: 'assign'}).then(function () {
                throw new Error('Browse roles is not denied without authentication.');
            });
        });
    });
});
