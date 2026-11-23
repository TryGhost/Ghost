import { createDropColumnMigration } from '../../utils';

export default createDropColumnMigration('comment_reports', 'reason', {
  type: 'text',
  maxlength: 65535,
  nullable: false,
});
