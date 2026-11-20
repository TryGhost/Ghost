import { createAddColumnMigration } from '../../utils';

export default createAddColumnMigration('posts', 'show_title_and_feature_image', {
  type: 'boolean',
  nullable: false,
  defaultTo: true,
});
