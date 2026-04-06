const assert = require('node:assert/strict');
const {assertExists} = require('../../../utils/assertions');
const {setIsRoles} = require('../../../../core/server/models/role-utils');
const _ = require('lodash');

describe('setIsRoles function behavior', function () {
    // create a fake 'loadedpermissions' object and then confirm the behavior of setIsRoles with it
    const loadedPermissionsEditor = {
        user: {
            roles: [{
                name: 'Editor'
            }]
        }
    };
    const loadedPermissionsAdmin = {
        user: {
            roles: [{
                name: 'Administrator'
            }]
        }
    };
    const loadedPermissionsAuthor = {
        user: {
            roles: [{
                name: 'Author'
            }]
        }
    };
    const loadedPermissionsSuperEditor = {
        user: {
            roles: [{
                name: 'Super Editor'
            }]
        }
    };
    const loadedPermissionsWithMultipleRoles = {
        user: {
            roles: [{
                name: 'Editor'
            }, {
                name: 'Author'
            }]
        }
    };
    const loadedPermissionsWithNoRoles = {
        user: {
            roles: []
        }
    };
    const loadedPermissionsWithNoUser = {
        user: null
    };
    const loadedPermissionswithPermissions = {
        user: {
            permissions: [{
                id: 'posts.edit'
            }],
            roles: []
        }
    };

    it('returns an object', function () {
        let result = setIsRoles(loadedPermissionsEditor);
        assertExists(result);
        assert(_.isPlainObject(result));
    });

    it('returns the correct object for Editor', function () {
        let result = setIsRoles(loadedPermissionsEditor);
        assert(_.isPlainObject(result));
        assert.equal(result.isOwner, false);
        assert.equal(result.isAdmin, false);
        assert.equal(result.isEditor, true);
        assert.equal(result.isAuthor, false);
        assert.equal(result.isContributor, false);
        assert.equal(result.isSuperEditor, false);
        assert.equal(result.isEitherEditor, true);
    });

    it('returns the correct object for Administrator', function () {
        let result = setIsRoles(loadedPermissionsAdmin);
        assert(_.isPlainObject(result));
        assert.equal(result.isOwner, false);
        assert.equal(result.isAdmin, true);
        assert.equal(result.isEditor, false);
        assert.equal(result.isAuthor, false);
        assert.equal(result.isContributor, false);
        assert.equal(result.isSuperEditor, false);
        assert.equal(result.isEitherEditor, false);
    });

    it('returns the correct object for Author', function () {
        let result = setIsRoles(loadedPermissionsAuthor);
        assert(_.isPlainObject(result));
        assert.equal(result.isOwner, false);
        assert.equal(result.isAdmin, false);
        assert.equal(result.isEditor, false);
        assert.equal(result.isAuthor, true);
        assert.equal(result.isContributor, false);
        assert.equal(result.isSuperEditor, false);
        assert.equal(result.isEitherEditor, false);
    });

    it('returns the correct object for Super Editor', function () {
        let result = setIsRoles(loadedPermissionsSuperEditor);
        assert(_.isPlainObject(result));
        assert.equal(result.isOwner, false);
        assert.equal(result.isAdmin, false);
        assert.equal(result.isEditor, false);
        assert.equal(result.isAuthor, false);
        assert.equal(result.isContributor, false);
        assert.equal(result.isSuperEditor, true);
        assert.equal(result.isEitherEditor, true);
    });

    it('returns the correct object for multiple roles', function () {
        let result = setIsRoles(loadedPermissionsWithMultipleRoles);
        assert(_.isPlainObject(result));
        assert.equal(result.isOwner, false);
        assert.equal(result.isAdmin, false);
        assert.equal(result.isEditor, true);
        assert.equal(result.isAuthor, true);
        assert.equal(result.isContributor, false);
        assert.equal(result.isSuperEditor, false);
        assert.equal(result.isEitherEditor, true);
    });
    it('returns the correct object for no roles', function () {
        let result = setIsRoles(loadedPermissionsWithNoRoles);
        assert(_.isPlainObject(result));
        assert.equal(result.isOwner, false);
        assert.equal(result.isAdmin, false);
        assert.equal(result.isEditor, false);
        assert.equal(result.isAuthor, false);
        assert.equal(result.isContributor, false);
        assert.equal(result.isSuperEditor, false);
        assert.equal(result.isEitherEditor, false);
    });
    it('returns the correct object for no user', function () {
        let result = setIsRoles(loadedPermissionsWithNoUser);
        assert(_.isPlainObject(result));
        assert.equal(result.isOwner, false);
        assert.equal(result.isAdmin, false);
        assert.equal(result.isEditor, false);
        assert.equal(result.isAuthor, false);
        assert.equal(result.isContributor, false);
        assert.equal(result.isSuperEditor, false);
        assert.equal(result.isEitherEditor, false);
    });
    it('returns the correct object for permissions without role', function () {
        let result = setIsRoles(loadedPermissionswithPermissions);
        assert(_.isPlainObject(result));
        assert.equal(result.isOwner, false);
        assert.equal(result.isAdmin, false);
        assert.equal(result.isEditor, false);
        assert.equal(result.isAuthor, false);
        assert.equal(result.isContributor, false);
        assert.equal(result.isSuperEditor, false);
        assert.equal(result.isEitherEditor, false);
    });
});
