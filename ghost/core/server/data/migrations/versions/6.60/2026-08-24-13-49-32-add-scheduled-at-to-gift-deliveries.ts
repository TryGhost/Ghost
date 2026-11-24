import {
  combineNonTransactionalMigrations,
  createAddColumnMigration,
  createAddIndexMigration,
} from '../../utils';

export default combineNonTransactionalMigrations(
  createAddColumnMigration(
    'gift_deliveries',
    'scheduled_at',
    {
      type: 'dateTime',
      nullable: true,
    },
    { algorithm: 'auto' },
  ),
  createAddIndexMigration('gift_deliveries', ['status', 'scheduled_at']),
);
