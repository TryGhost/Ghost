const {addPermission} = require('../../utils');

module.exports = addPermission({
    name: 'Read member signin urls',
    action: 'read',
    object: 'member_signin_url'
});
