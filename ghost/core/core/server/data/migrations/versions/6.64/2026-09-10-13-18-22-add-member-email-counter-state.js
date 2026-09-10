const { combineNonTransactionalMigrations, createAddColumnMigration } = require('../../utils');

module.exports = combineNonTransactionalMigrations(
  // NULL distinguishes counters awaiting a derived baseline from a valid zero.
  // Historical initialization belongs in the bounded sweep, not this migration.
  createAddColumnMigration('members', 'email_tracked_count', {
    type: 'integer',
    unsigned: true,
    nullable: true,
  }),
  // Future preparation accounting must update this marker and member counters
  // in one transaction, after preparation has frozen the batch membership.
  createAddColumnMigration('email_batches', 'member_counters_applied_at', {
    type: 'dateTime',
    nullable: true,
  }),
);
