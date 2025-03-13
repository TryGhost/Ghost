// check if the user has an assigned role
// so that we can stop writing this everywhere:
//_.some(loadedPermissions.user.roles, {name: 'Administrator'})

function checkUserPermissionsForRole(loadedPermissions, roleName) {
    if (!loadedPermissions?.user?.roles) {
        return false;
    }

    return loadedPermissions.user.roles.some(role => role.name === roleName);
}

function setIsRoles(loadedPermissions) {
    // utility function to parse the permissions object and set up all the "is" variables.
    let resultsObject = {
        isOwner: false,
        isAdmin: false,
        isEditor: false,
        isAuthor: false,
        isContributor: false,
        isSuperEditor: false,
        isEitherEditor: false
    };
    if (!loadedPermissions?.user?.roles) {
        return resultsObject;
    }
    resultsObject.isOwner = checkUserPermissionsForRole(loadedPermissions, 'Owner');
    resultsObject.isAdmin = checkUserPermissionsForRole(loadedPermissions, 'Administrator');
    resultsObject.isEditor = checkUserPermissionsForRole(loadedPermissions, 'Editor');
    resultsObject.isAuthor = checkUserPermissionsForRole(loadedPermissions, 'Author');
    resultsObject.isContributor = checkUserPermissionsForRole(loadedPermissions, 'Contributor');
    resultsObject.isSuperEditor = checkUserPermissionsForRole(loadedPermissions, 'Super Editor');
    resultsObject.isEitherEditor = resultsObject.isEditor || resultsObject.isSuperEditor;
    return resultsObject;
}

exports.setIsRoles = setIsRoles;
exports.checkUserPermissionsForRole = checkUserPermissionsForRole;