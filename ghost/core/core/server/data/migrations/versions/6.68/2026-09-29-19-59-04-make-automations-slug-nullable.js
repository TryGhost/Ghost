const DatabaseInfo = require('@tryghost/database-info');
const logging = require('@tryghost/logging');
const { createSetNullableMigration } = require('../../utils');

const nullableMigration = createSetNullableMigration('automations', 'slug');

module.exports = {
  ...nullableMigration,

  async down(config) {
    logging.info('Backfilling null automations.slug values with random IDs');
    const connection = config.transacting || config.connection;
    const randomId = DatabaseInfo.isSQLite(connection) ? 'hex(randomblob(64))' : 'UUID()';
    await connection('automations').whereNull('slug').update('slug', connection.raw(randomId));

    logging.info('Making automations.slug required');
    await nullableMigration.down(config);
  },
};
