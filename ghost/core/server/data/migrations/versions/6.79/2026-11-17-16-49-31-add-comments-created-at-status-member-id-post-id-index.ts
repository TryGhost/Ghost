import { createAddIndexMigration } from '../../utils';

export default createAddIndexMigration('comments', [
  'created_at',
  'status',
  'member_id',
  'post_id',
]);
