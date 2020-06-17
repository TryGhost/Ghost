const {addPermission} = require('../../utils');

module.exports = addPermission({
    name: 'Read identities',
    action: 'read',
    object: 'identity'
});
