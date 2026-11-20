import { createAddColumnMigration } from '../../utils';

export default createAddColumnMigration('newsletters', 'feedback_enabled', {
  type: 'boolean',
  nullable: false,
  defaultTo: false,
});
