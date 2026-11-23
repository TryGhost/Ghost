import { addPermissionWithRoles } from '../../utils';

export default addPermissionWithRoles(
  {
    name: 'Edit links',
    action: 'edit',
    object: 'link',
  },
  ['Administrator', 'Admin Integration'],
);
