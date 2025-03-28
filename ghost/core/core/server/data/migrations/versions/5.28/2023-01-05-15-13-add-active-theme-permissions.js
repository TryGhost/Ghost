const {addPermissionWithRoles} = require('../../utils');

module.exports = addPermissionWithRoles({
    name: 'View active theme details',
    action: 'readActive',
    object: 'theme'
}, [
    'Author',
    'Editor',
    'Administrator',
    'Admin Integration'
]);
