import { combineNonTransactionalMigrations, createDropColumnMigration } from '../../utils';

export default combineNonTransactionalMigrations(
  createDropColumnMigration('gift_links', 'redeemed_count', {
    type: 'integer',
    nullable: false,
    unsigned: true,
    defaultTo: 0,
  }),
  createDropColumnMigration('gift_links', 'last_redeemed_at', {
    type: 'dateTime',
    nullable: true,
  }),
);
