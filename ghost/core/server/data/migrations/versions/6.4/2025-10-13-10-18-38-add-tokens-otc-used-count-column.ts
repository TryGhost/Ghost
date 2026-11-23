import { createAddColumnMigration } from '../../utils';

export default createAddColumnMigration('tokens', 'otc_used_count', {
  type: 'integer',
  nullable: false,
  unsigned: true,
  defaultTo: 0,
});
