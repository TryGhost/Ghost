import { addPermissionWithRoles } from '../../utils';

export default addPermissionWithRoles(
  {
    name: 'Poll automations',
    action: 'poll',
    object: 'automation',
  },
  ['Scheduler Integration'],
);
