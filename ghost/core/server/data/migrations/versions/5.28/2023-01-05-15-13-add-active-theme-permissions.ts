import { addPermissionWithRoles } from '../../utils';

export default addPermissionWithRoles(
  {
    name: 'View active theme details',
    action: 'readActive',
    object: 'theme',
  },
  ['Author', 'Editor', 'Administrator', 'Admin Integration'],
);
