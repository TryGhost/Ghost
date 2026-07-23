const {addPermissionWithRoles} = require('../../utils');

module.exports = addPermissionWithRoles({
    name: 'Flush gift deliveries',
    action: 'flushDeliveries',
    object: 'gift'
}, [
    'Scheduler Integration'
]);
