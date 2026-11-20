import { createAddColumnMigration } from '../../utils';

export default createAddColumnMigration('post_revisions', 'feature_image', {
  type: 'string',
  maxlength: 2000,
  nullable: true,
});
