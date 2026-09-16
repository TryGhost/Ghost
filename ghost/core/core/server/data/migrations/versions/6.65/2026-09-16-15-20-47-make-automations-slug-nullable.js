const DatabaseInfo = require('@tryghost/database-info');
const logging = require('@tryghost/logging');
const { createSetNullableMigration } = require('../../utils');

const nullableMigration = createSetNullableMigration('automations', 'slug');

module.exports = {
  ...nullableMigration,

  async down(config) {
    const connection = config.transacting || config.connection;
    logging.info('Backfilling null automations.slug values with UUIDs');

    if (DatabaseInfo.isSQLite(connection)) {
      await connection.raw(`
        UPDATE automations
        SET slug = hex(randomblob(64))
        WHERE slug IS NULL
      `);
    } else {
      await connection.raw('UPDATE automations SET slug = UUID() WHERE slug IS NULL');
    }

    logging.info('Making automations.slug required');
    await nullableMigration.down(config);
  },
};
