const {addPermissionWithRoles} = require('../../utils');

module.exports = addPermissionWithRoles({
    name: 'Flush gift reminders',
    action: 'flushReminders',
    object: 'gift'
}, [
    'Scheduler Integration'
]);
