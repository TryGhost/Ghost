const {addPermissionWithRoles} = require('../../utils');

module.exports = addPermissionWithRoles({
    name: 'Edit links',
    action: 'edit',
    object: 'link'
}, [
    'Administrator',
    'Admin Integration'
]);
