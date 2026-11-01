const logging = require('@tryghost/logging');
const { createTransactionalMigration } = require('../../utils');

// Apps are behind a private labs flag, so these tables only hold test data, which an app's
// identity can't be proven for. Clearing them lets the next migrations add the keys every
// installation now needs, which can't be added to filled tables without a placeholder value.
module.exports = createTransactionalMigration(
  async function up(knex) {
    // Manifests first, as each references its installation.
    const manifests = await knex('app_installation_manifests').del();
    const installations = await knex('app_installations').del();
    logging.info(
      `Cleared ${installations} app installations and ${manifests} app installation manifests`,
    );
  },
  async function down() {
    logging.warn('Not restoring cleared app installations, which were test data');
  },
);
