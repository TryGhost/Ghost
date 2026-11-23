import { addPermissionWithRoles } from '../../utils';

export default addPermissionWithRoles(
  {
    name: 'Add automations',
    action: 'add',
    object: 'automation',
  },
  ['Administrator', 'Admin Integration'],
);
