const { combineNonTransactionalMigrations, createAddColumnMigration } = require('../../utils');

// Let MySQL pick INSTANT/INPLACE instead of the default COPY rebuild: members is
// the largest and hottest table, and a copy would block writes for its duration.
const addColumn = (table, name, definition) =>
  createAddColumnMigration(table, name, definition, { algorithm: 'auto' });

module.exports = combineNonTransactionalMigrations(
  // NULL distinguishes counters awaiting a derived baseline from a valid zero.
  // Historical initialization belongs in the bounded sweep, not this migration.
  addColumn('members', 'email_tracked_count', {
    type: 'integer',
    unsigned: true,
    nullable: true,
  }),
  // Old batches are never implicitly enrolled by a NULL application marker.
  // Future batch creation opts in explicitly, before any counter application.
  addColumn('email_batches', 'member_counters_enabled', {
    type: 'boolean',
    nullable: false,
    defaultTo: false,
  }),
  // Future preparation accounting must update this marker and member counters
  // in one transaction, after preparation has frozen the batch membership.
  addColumn('email_batches', 'member_counters_applied_at', {
    type: 'dateTime',
    nullable: true,
  }),
);
