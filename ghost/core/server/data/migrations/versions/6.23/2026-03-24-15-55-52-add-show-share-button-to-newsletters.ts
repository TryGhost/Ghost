import { createAddColumnMigration } from '../../utils';

export default createAddColumnMigration('newsletters', 'show_share_button', {
  type: 'boolean',
  nullable: false,
  defaultTo: false,
});
