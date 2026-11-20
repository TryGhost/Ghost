import { createAddColumnMigration } from '../../utils';

export default createAddColumnMigration('comment_likes', 'score', {
  type: 'integer',
  nullable: false,
  defaultTo: 1,
});
