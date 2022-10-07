const {addPermissionWithRoles} = require('../../utils');

module.exports = addPermissionWithRoles({
    name: 'Report comments',
    action: 'report',
    object: 'comment'
}, [
    'Administrator',
    'Admin Integration'
]);
