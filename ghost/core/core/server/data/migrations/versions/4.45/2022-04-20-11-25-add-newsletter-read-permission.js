const {addPermissionWithRoles} = require('../../utils');

module.exports = addPermissionWithRoles({
    name: 'Read newsletters',
    action: 'read',
    object: 'newsletter'
}, [
    'Administrator'
]);
