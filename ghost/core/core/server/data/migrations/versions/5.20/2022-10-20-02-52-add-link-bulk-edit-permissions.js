const {addPermissionWithRoles} = require('../../utils');

module.exports = addPermissionWithRoles({
    name: 'Bulk edit links',
    action: 'bulkEdit',
    object: 'link'
}, [
    'Administrator',
    'Admin Integration'
]);
