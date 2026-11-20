import { createDropNullableMigration } from '../../utils';

// We need to disable foreign key checks because if MySQL is missing the STRICT_TRANS_TABLES mode, we cannot drop nullable from a foreign key
export default createDropNullableMigration('comment_likes', 'member_id', {
  disableForeignKeyChecks: true,
});
