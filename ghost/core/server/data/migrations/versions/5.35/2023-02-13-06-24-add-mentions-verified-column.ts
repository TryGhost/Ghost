import { createAddColumnMigration } from '../../utils';

export default createAddColumnMigration('mentions', 'verified', {
  type: 'boolean',
  nullable: false,
  defaultTo: false,
});
