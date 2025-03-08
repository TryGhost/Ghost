// check if the user has an assigned role
// so that we can stop writing this everywhere:
//_.some(loadedPermissions.user.roles, {name: 'Administrator'})

const _ = require('lodash');

function checkUserPermissionsForRole(loadedPermissions, roleName) {
    if (!loadedPermissions?.user?.roles) {
        return false;
    }

    return _.some(loadedPermissions.user.roles, {name: roleName});
}

exports.checkUserPermissionsForRole = checkUserPermissionsForRole;
