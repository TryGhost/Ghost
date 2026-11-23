import { createAddColumnMigration } from '../../utils';

export default createAddColumnMigration('members', 'email_disabled', {
  type: 'boolean',
  nullable: false,
  defaultTo: false,
});
