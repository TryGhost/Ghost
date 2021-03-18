const {
    addPermission
} = require('../../utils');

module.exports = addPermission({
    name: 'Backup database',
    action: 'backupContent',
    object: 'db'
});
