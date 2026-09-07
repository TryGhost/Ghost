const { combineNonTransactionalMigrations, createAddColumnMigration } = require('../../utils');

module.exports = combineNonTransactionalMigrations(
  createAddColumnMigration(
    'emails',
    'preflight_email_count',
    { type: 'integer', nullable: true, unsigned: true },
    { algorithm: 'instant' },
  ),
  createAddColumnMigration(
    'emails',
    'candidate_count',
    { type: 'integer', nullable: true, unsigned: true },
    { algorithm: 'instant' },
  ),
  createAddColumnMigration(
    'emails',
    'preparation_excluded_count',
    { type: 'integer', nullable: true, unsigned: true },
    { algorithm: 'instant' },
  ),
  createAddColumnMigration(
    'emails',
    'prepared_at',
    { type: 'dateTime', nullable: true },
    { algorithm: 'instant' },
  ),
  createAddColumnMigration(
    'email_batches',
    'recipient_count',
    { type: 'integer', nullable: true, unsigned: true },
    { algorithm: 'instant' },
  ),
  createAddColumnMigration(
    'email_batches',
    'submission_excluded_count',
    { type: 'integer', nullable: true, unsigned: true },
    { algorithm: 'instant' },
  ),
  createAddColumnMigration(
    'email_batches',
    'submitted_count',
    { type: 'integer', nullable: true, unsigned: true },
    { algorithm: 'instant' },
  ),
);
