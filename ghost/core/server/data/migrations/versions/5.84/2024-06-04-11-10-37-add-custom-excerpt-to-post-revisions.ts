import { createAddColumnMigration } from '../../utils';

export default createAddColumnMigration('post_revisions', 'custom_excerpt', {
  type: 'string',
  maxlength: 2000,
  nullable: true,
});
