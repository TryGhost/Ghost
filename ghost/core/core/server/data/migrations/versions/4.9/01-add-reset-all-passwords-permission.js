const {
    addPermissionWithRoles
} = require('../../utils');

module.exports = addPermissionWithRoles({
    name: 'Reset all passwords',
    action: 'resetAllPasswords',
    object: 'authentication'
}, [
    'Administrator'
]);
