const {addPermissionWithRoles} = require('../../utils');

module.exports = addPermissionWithRoles({
    name: 'Browse mentions',
    action: 'browse',
    object: 'mention'
}, [
    'Administrator',
    'Admin Integration'
]);
