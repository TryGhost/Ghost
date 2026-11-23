import { createAddColumnMigration } from '../../utils';

export default createAddColumnMigration('mentions', 'revalidation_failure_count', {
  type: 'integer',
  nullable: false,
  unsigned: true,
  defaultTo: 0,
});
