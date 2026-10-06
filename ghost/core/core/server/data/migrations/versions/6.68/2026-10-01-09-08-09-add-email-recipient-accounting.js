const { combineNonTransactionalMigrations, createAddColumnMigration } = require('../../utils');

const addColumn = (table, name, definition) =>
  createAddColumnMigration(table, name, definition, { algorithm: 'auto' });

module.exports = combineNonTransactionalMigrations(
  addColumn('emails', 'preflight_email_count', { type: 'integer', nullable: true, unsigned: true }),
  addColumn('emails', 'candidate_count', { type: 'integer', nullable: true, unsigned: true }),
  addColumn('emails', 'preparation_excluded_count', {
    type: 'integer',
    nullable: true,
    unsigned: true,
  }),
  addColumn('emails', 'prepared_at', { type: 'dateTime', nullable: true }),
  addColumn('email_batches', 'recipient_count', {
    type: 'integer',
    nullable: true,
    unsigned: true,
  }),
  addColumn('email_batches', 'submission_excluded_count', {
    type: 'integer',
    nullable: true,
    unsigned: true,
  }),
  addColumn('email_batches', 'submitted_count', {
    type: 'integer',
    nullable: true,
    unsigned: true,
  }),
);
