const { addPermissionWithRoles } = require('../../utils');

module.exports = addPermissionWithRoles(
  {
    name: 'Add automations',
    action: 'add',
    object: 'automation',
  },
  ['Administrator', 'Admin Integration'],
);
