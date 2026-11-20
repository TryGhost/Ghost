import { combineNonTransactionalMigrations, createAddColumnMigration } from '../../utils';

export default combineNonTransactionalMigrations(
  createAddColumnMigration('jobs', 'metadata', {
    type: 'string',
    maxlength: 2000,
    nullable: true,
  }),
  createAddColumnMigration('jobs', 'queue_entry', {
    type: 'integer',
    nullable: true,
    unsigned: true,
  }),
);
