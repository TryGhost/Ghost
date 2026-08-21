const {
  combineNonTransactionalMigrations,
  createAddColumnMigration,
  createAddIndexMigration,
} = require('../../utils');

module.exports = combineNonTransactionalMigrations(
  createAddColumnMigration(
    'gifts',
    'redeemable_at',
    {
      type: 'dateTime',
      nullable: true,
    },
    { algorithm: 'auto' },
  ),
  createAddIndexMigration('gifts', ['status', 'redeemable_at']),
);
