import { createAddColumnMigration } from '../../utils';

export default createAddColumnMigration('newsletters', 'show_comment_cta', {
  type: 'boolean',
  nullable: false,
  defaultTo: true,
});
