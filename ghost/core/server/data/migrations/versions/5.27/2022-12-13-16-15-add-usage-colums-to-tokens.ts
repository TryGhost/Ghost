import { createAddColumnMigration, combineNonTransactionalMigrations } from '../../utils';

export default combineNonTransactionalMigrations(
  createAddColumnMigration('tokens', 'updated_at', {
    type: 'dateTime',
    nullable: true,
  }),

  createAddColumnMigration('tokens', 'first_used_at', {
    type: 'dateTime',
    nullable: true,
  }),

  createAddColumnMigration('tokens', 'used_count', {
    type: 'integer',
    nullable: false,
    unsigned: true,
    defaultTo: 0,
  }),
);
