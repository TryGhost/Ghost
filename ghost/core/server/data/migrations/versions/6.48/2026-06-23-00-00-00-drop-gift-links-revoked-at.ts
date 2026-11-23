import { createDropColumnMigration } from '../../utils';

export default createDropColumnMigration('gift_links', 'revoked_at', {
  type: 'dateTime',
  nullable: true,
});
