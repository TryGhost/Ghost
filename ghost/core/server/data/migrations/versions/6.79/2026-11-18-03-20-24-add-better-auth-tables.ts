import { addTable, combineNonTransactionalMigrations } from '../../utils';

// Graduates the in-development tables; `replaceDevelopmentCopy` replaces the
// copies development and testing databases already have
export default combineNonTransactionalMigrations(
  addTable(
    'user_accounts',
    {
      id: { type: 'string', maxlength: 24, nullable: false, primary: true },
      user_id: {
        type: 'string',
        maxlength: 24,
        nullable: false,
        references: 'users.id',
        cascadeDelete: true,
      },
      account_id: { type: 'string', maxlength: 191, nullable: false },
      provider_id: { type: 'string', maxlength: 191, nullable: false },
      access_token: { type: 'text', maxlength: 65535, nullable: true },
      refresh_token: { type: 'text', maxlength: 65535, nullable: true },
      id_token: { type: 'text', maxlength: 65535, nullable: true },
      access_token_expires_at: { type: 'dateTime', precision: 3, nullable: true },
      refresh_token_expires_at: { type: 'dateTime', precision: 3, nullable: true },
      scope: { type: 'text', maxlength: 65535, nullable: true },
      password: { type: 'string', maxlength: 191, nullable: true },
      created_at: { type: 'dateTime', precision: 3, nullable: false },
      updated_at: { type: 'dateTime', precision: 3, nullable: false },
      '@@UNIQUE_CONSTRAINTS@@': [['provider_id', 'account_id']],
    },
    { replaceDevelopmentCopy: true },
  ),
  addTable(
    'user_sessions',
    {
      id: { type: 'string', maxlength: 24, nullable: false, primary: true },
      user_id: {
        type: 'string',
        maxlength: 24,
        nullable: false,
        references: 'users.id',
        cascadeDelete: true,
      },
      token: { type: 'string', maxlength: 191, nullable: false, unique: true },
      expires_at: { type: 'dateTime', precision: 3, nullable: false, index: true },
      ip_address: { type: 'string', maxlength: 45, nullable: true },
      user_agent: { type: 'text', maxlength: 65535, nullable: true },
      origin: { type: 'string', maxlength: 2000, nullable: true },
      verified: { type: 'boolean', nullable: false, defaultTo: false },
      created_at: { type: 'dateTime', precision: 3, nullable: false },
      updated_at: { type: 'dateTime', precision: 3, nullable: false },
    },
    { replaceDevelopmentCopy: true },
  ),
  addTable(
    'verifications',
    {
      id: { type: 'string', maxlength: 24, nullable: false, primary: true },
      identifier: { type: 'string', maxlength: 191, nullable: false, index: true },
      value: { type: 'text', maxlength: 65535, nullable: false },
      expires_at: { type: 'dateTime', precision: 3, nullable: false, index: true },
      attempts: { type: 'integer', unsigned: true, nullable: false, defaultTo: 0 },
      created_at: { type: 'dateTime', precision: 3, nullable: false },
      updated_at: { type: 'dateTime', precision: 3, nullable: false },
    },
    { replaceDevelopmentCopy: true },
  ),
);
