import { createAddColumnMigration } from '../../utils';

export default createAddColumnMigration('emails', 'feedback_enabled', {
  type: 'boolean',
  nullable: false,
  defaultTo: false,
});
