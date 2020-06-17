const {
    addPermission
} = require('../../utils');

module.exports = addPermission({
    name: 'Edit webhooks',
    action: 'edit',
    object: 'webhook'
});
