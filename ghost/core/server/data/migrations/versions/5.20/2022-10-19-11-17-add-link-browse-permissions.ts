import { addPermissionWithRoles } from '../../utils';

export default addPermissionWithRoles(
  {
    name: 'Browse links',
    action: 'browse',
    object: 'link',
  },
  ['Administrator', 'Admin Integration'],
);
