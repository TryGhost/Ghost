const {
  addTable,
  createAddColumnMigration,
  combineNonTransactionalMigrations,
} = require('../../utils');

const migrations = [
  addTable('email_provider_events', {
    id: { type: 'string', maxlength: 24, nullable: false, primary: true },
    event_key: { type: 'string', maxlength: 64, nullable: false, unique: true },
    source: { type: 'string', maxlength: 64, nullable: false },
    payload: { type: 'text', maxlength: 65535, nullable: false },
    status: { type: 'string', maxlength: 20, nullable: false, defaultTo: 'pending' },
    attempts: { type: 'integer', nullable: false, defaultTo: 0 },
    next_attempt_at: { type: 'dateTime', nullable: false },
    lease_token: { type: 'string', maxlength: 24, nullable: true },
    lease_expires_at: { type: 'dateTime', nullable: true },
    applied_at: { type: 'dateTime', nullable: true },
    completed_at: { type: 'dateTime', nullable: true },
    result: { type: 'text', maxlength: 65535, nullable: true },
    last_error: { type: 'string', maxlength: 2000, nullable: true },
    created_at: { type: 'dateTime', nullable: false },
    '@@INDEXES@@': [
      ['status', 'next_attempt_at'],
      ['status', 'lease_expires_at'],
    ],
  }),
  ...['email_batches', 'automated_email_recipients', 'gift_deliveries'].map((table) =>
    createAddColumnMigration(table, 'email_provider_source', {
      type: 'string',
      maxlength: 64,
      nullable: false,
      defaultTo: 'mailgun',
    }),
  ),
];

module.exports = combineNonTransactionalMigrations(...migrations);
