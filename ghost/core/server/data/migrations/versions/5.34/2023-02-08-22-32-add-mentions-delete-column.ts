import { createAddColumnMigration } from '../../utils';

export default createAddColumnMigration('mentions', 'deleted', {
  type: 'boolean',
  nullable: false,
  defaultTo: false,
});
