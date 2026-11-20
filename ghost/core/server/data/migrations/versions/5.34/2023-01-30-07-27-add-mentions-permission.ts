import { addPermissionWithRoles } from '../../utils';

export default addPermissionWithRoles(
  {
    name: 'Browse mentions',
    action: 'browse',
    object: 'mention',
  },
  ['Administrator', 'Admin Integration'],
);
