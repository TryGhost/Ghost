module.exports = [
    // add jquery setting and privacy info
    require('./01-update-ghost-client-secrets'),
    // add ghost-scheduler client
    require('./02-add-ghost-scheduler-client'),
    // add client permissions and permission_role relations
    require('./03-add-client-permissions')
];
