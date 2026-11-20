import { createAddColumnMigration } from '../../utils';

export default createAddColumnMigration('newsletters', 'show_latest_posts', {
  type: 'boolean',
  nullable: false,
  defaultTo: false,
});
