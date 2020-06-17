const {
    addPermissionWithRoles
} = require('../../utils');

module.exports = addPermissionWithRoles({
    name: 'Read emails',
    action: 'read',
    object: 'email'
}, [
    'Administrator',
    'Admin Integration',
    'Editor',
    'Author',
    'Contributor'
]);
