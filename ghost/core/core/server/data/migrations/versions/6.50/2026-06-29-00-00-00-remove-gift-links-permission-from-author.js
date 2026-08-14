const {removePermissionFromRole} = require('../../utils');

// Authors cannot change post visibility, so they should not be able to manage gift
// links either. Drop the over-broad grant added in the original gift links rollout.
module.exports = removePermissionFromRole({
    permission: 'Manage gift links',
    role: 'Author'
});
