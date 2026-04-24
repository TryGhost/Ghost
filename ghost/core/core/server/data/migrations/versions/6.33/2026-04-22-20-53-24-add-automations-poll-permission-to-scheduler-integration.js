const {addPermissionWithRoles} = require('../../utils');

module.exports = addPermissionWithRoles({
    name: 'Poll automations',
    action: 'poll',
    object: 'automation'
}, [
    'Scheduler Integration'
]);
