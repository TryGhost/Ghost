const should = require('should');
const {setIsRoles} = require('../../../../core/server/models/role-utils');

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
        should.exist(result);
        result.should.be.an.Object();
    });

    it('returns the correct object for Editor', function () {
        let result = setIsRoles(loadedPermissionsEditor);
        result.should.be.an.Object();
        result.isOwner.should.equal(false);
        result.isAdmin.should.equal(false);
        result.isEditor.should.equal(true);
        result.isAuthor.should.equal(false);
        result.isContributor.should.equal(false);
        result.isSuperEditor.should.equal(false);
        result.isEitherEditor.should.equal(true);
    });

    it('returns the correct object for Administrator', function () {
        let result = setIsRoles(loadedPermissionsAdmin);
        result.should.be.an.Object();
        result.isOwner.should.equal(false);
        result.isAdmin.should.equal(true);
        result.isEditor.should.equal(false);
        result.isAuthor.should.equal(false);
        result.isContributor.should.equal(false);
        result.isSuperEditor.should.equal(false);
        result.isEitherEditor.should.equal(false);
    });

    it('returns the correct object for Author', function () {
        let result = setIsRoles(loadedPermissionsAuthor);
        result.should.be.an.Object();
        result.isOwner.should.equal(false);
        result.isAdmin.should.equal(false);
        result.isEditor.should.equal(false);
        result.isAuthor.should.equal(true);
        result.isContributor.should.equal(false);
        result.isSuperEditor.should.equal(false);
        result.isEitherEditor.should.equal(false);
    });

    it('returns the correct object for Super Editor', function () {
        let result = setIsRoles(loadedPermissionsSuperEditor);
        result.should.be.an.Object();
        result.isOwner.should.equal(false);
        result.isAdmin.should.equal(false);
        result.isEditor.should.equal(false);
        result.isAuthor.should.equal(false);
        result.isContributor.should.equal(false);
        result.isSuperEditor.should.equal(true);
        result.isEitherEditor.should.equal(true);
    });

    it('returns the correct object for multiple roles', function () {
        let result = setIsRoles(loadedPermissionsWithMultipleRoles);
        result.should.be.an.Object();
        result.isOwner.should.equal(false);
        result.isAdmin.should.equal(false);
        result.isEditor.should.equal(true);
        result.isAuthor.should.equal(true);
        result.isContributor.should.equal(false);
        result.isSuperEditor.should.equal(false);
        result.isEitherEditor.should.equal(true);
    });
    it('returns the correct object for no roles', function () {
        let result = setIsRoles(loadedPermissionsWithNoRoles);
        result.should.be.an.Object();
        result.isOwner.should.equal(false);
        result.isAdmin.should.equal(false);
        result.isEditor.should.equal(false);
        result.isAuthor.should.equal(false);
        result.isContributor.should.equal(false);
        result.isSuperEditor.should.equal(false);
        result.isEitherEditor.should.equal(false);
    });
    it('returns the correct object for no user', function () {
        let result = setIsRoles(loadedPermissionsWithNoUser);
        result.should.be.an.Object();
        result.isOwner.should.equal(false);
        result.isAdmin.should.equal(false);
        result.isEditor.should.equal(false);
        result.isAuthor.should.equal(false);
        result.isContributor.should.equal(false);
        result.isSuperEditor.should.equal(false);
        result.isEitherEditor.should.equal(false);
    });
    it('returns the correct object for permissions without role', function () {
        let result = setIsRoles(loadedPermissionswithPermissions);
        result.should.be.an.Object();
        result.isOwner.should.equal(false);
        result.isAdmin.should.equal(false);
        result.isEditor.should.equal(false);
        result.isAuthor.should.equal(false);
        result.isContributor.should.equal(false);
        result.isSuperEditor.should.equal(false);
        result.isEitherEditor.should.equal(false);
    });
});
