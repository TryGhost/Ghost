import DatabaseInfo from '@tryghost/database-info';
import logging from '@tryghost/logging';
import { createSetNullableMigration } from '../../utils';

const nullableMigration = createSetNullableMigration('automations', 'slug');

export default {
  ...nullableMigration,

  async down(config: any) {
    logging.info('Backfilling null automations.slug values with random IDs');
    const connection = config.transacting || config.connection;
    const randomId = DatabaseInfo.isSQLite(connection) ? 'hex(randomblob(64))' : 'UUID()';
    await connection('automations').whereNull('slug').update('slug', connection.raw(randomId));

    logging.info('Making automations.slug required');
    await nullableMigration.down(config);
  },
};
