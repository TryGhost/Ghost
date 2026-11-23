import { addPermissionWithRoles } from '../../utils';

export default addPermissionWithRoles(
  {
    name: 'Flush gift deliveries',
    action: 'flushDeliveries',
    object: 'gift',
  },
  ['Scheduler Integration'],
);
