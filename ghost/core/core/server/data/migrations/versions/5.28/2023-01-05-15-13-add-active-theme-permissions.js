const {addPermissionWithRoles} = require('../../utils');

module.exports = addPermissionWithRoles({
    name: 'View active theme details',
    action: 'active',
    object: 'theme'
}, [
    'Author',
    'Editor',
    'Administrator',
    'Admin Integration'
]);
