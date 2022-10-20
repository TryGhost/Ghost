const {addPermissionWithRoles} = require('../../utils');

module.exports = addPermissionWithRoles({
    name: 'Browse links',
    action: 'browse',
    object: 'link'
}, [
    'Administrator',
    'Admin Integration'
]);
