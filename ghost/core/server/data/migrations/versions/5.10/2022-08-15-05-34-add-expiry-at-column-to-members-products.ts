import { createAddColumnMigration } from '../../utils';

export default createAddColumnMigration('members_products', 'expiry_at', {
  type: 'dateTime',
  nullable: true,
});
