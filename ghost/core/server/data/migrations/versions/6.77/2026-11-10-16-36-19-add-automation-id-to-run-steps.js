const logging = require('@tryghost/logging');
const DatabaseInfo = require('@tryghost/database-info');
const { createAddColumnMigration } = require('../../utils');

const columnMigration = createAddColumnMigration(
  'automation_run_steps',
  'automation_id',
  {
    type: 'string',
    maxlength: 24,
    nullable: true,
    references: 'automations.id',
    restrictDelete: true,
  },
  { algorithm: 'auto' },
);

// The helper emits column and FK additions separately. Repair a crash between
// those statements: an existing column alone must not make this migration skip
// the foreign key on restart. SQLite rebuilds its table atomically.
module.exports = {
  ...columnMigration,
  async up(options) {
    await columnMigration.up(options);
    const knex = options.connection;
    if (DatabaseInfo.isSQLite(knex)) {
      logging.info('Automation run step foreign key created with SQLite column');
      return;
    }
    const [keys] = await knex.raw(`SELECT 1 FROM information_schema.KEY_COLUMN_USAGE
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'automation_run_steps'
      AND COLUMN_NAME = 'automation_id' AND REFERENCED_TABLE_NAME = 'automations'`);
    if (keys.length) {
      logging.info('Automation run step automation_id foreign key already exists');
      return;
    }
    logging.info('Restoring missing automation run step automation_id foreign key');
    await knex.schema.table('automation_run_steps', (table) => {
      table.foreign('automation_id').references('automations.id').onDelete('RESTRICT');
    });
  },
};
