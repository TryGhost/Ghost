import { createAddColumnMigration } from '../../utils';

export default createAddColumnMigration('members', 'enable_updates_and_announcements', {
  type: 'boolean',
  nullable: true,
});
