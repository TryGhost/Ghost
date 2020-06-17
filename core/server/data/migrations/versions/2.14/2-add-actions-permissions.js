const {
    addPermissionWithRoles
} = require('../../utils');

module.exports = addPermissionWithRoles({
    name: 'Browse Actions',
    action: 'browse',
    object: 'action'
}, [
    'Administrator',
    'Admin Integration'
]);
