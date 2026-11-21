import { addPermissionWithRoles } from '../../utils';

export default addPermissionWithRoles(
  {
    name: 'Report comments',
    action: 'report',
    object: 'comment',
  },
  ['Administrator', 'Admin Integration'],
);
