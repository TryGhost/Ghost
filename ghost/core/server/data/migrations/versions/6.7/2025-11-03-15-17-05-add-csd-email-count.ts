import { createAddColumnMigration } from '../../utils';

export default createAddColumnMigration('emails', 'csd_email_count', {
  type: 'integer',
  nullable: true,
  unsigned: true,
});
