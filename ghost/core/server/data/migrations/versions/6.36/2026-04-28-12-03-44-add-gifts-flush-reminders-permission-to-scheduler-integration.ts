import { addPermissionWithRoles } from '../../utils';

export default addPermissionWithRoles(
  {
    name: 'Flush gift reminders',
    action: 'flushReminders',
    object: 'gift',
  },
  ['Scheduler Integration'],
);
