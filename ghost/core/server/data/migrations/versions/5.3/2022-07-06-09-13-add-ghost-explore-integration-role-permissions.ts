import { addPermissionWithRoles } from '../../utils';

export default addPermissionWithRoles(
  {
    name: 'Read explore data',
    action: 'read',
    object: 'explore',
  },
  ['Administrator', 'Admin Integration', 'Ghost Explore Integration'],
);
