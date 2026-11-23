import { createAddColumnMigration } from '../../utils';

export default createAddColumnMigration('newsletters', 'show_post_title_section', {
  type: 'boolean',
  nullable: false,
  defaultTo: true,
});
