import { createAddColumnMigration } from '../../utils';

export default createAddColumnMigration('products', 'trial_days', {
  type: 'integer',
  unsigned: true,
  nullable: false,
  defaultTo: 0,
});
