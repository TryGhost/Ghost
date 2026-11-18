import logging from '@tryghost/logging';
import {
  combineNonTransactionalMigrations,
  createAddColumnMigration,
  createNonTransactionalMigration,
} from '../../utils';

// Apps are behind a private labs flag, so these tables only hold test data. Stored manifests
// have no `access` field, which every manifest now needs and which says what an installation
// was approved for, so none of them can be read back or run. The staff history of those
// installations goes with them, as nothing can show it any more.
//
// Each manifest row now stores what changed from the approved manifest when it was added,
// which can't be added to filled rows without recomputing it, so the column is added once
// the table is empty.
export default combineNonTransactionalMigrations(
  createNonTransactionalMigration(
    async function up(knex) {
      // Together, so a failure part-way leaves nothing half cleared. The column is added
      // outside the transaction, as MySQL commits around a schema change.
      const { actions, manifests, installations } = await knex.transaction(async (trx) => ({
        actions: await trx('actions').where({ resource_type: 'app_installation' }).del(),
        // Manifests first, as each references its installation.
        manifests: await trx('app_installation_manifests').del(),
        installations: await trx('app_installations').del(),
      }));
      logging.info(
        `Cleared ${installations} app installations, ${manifests} app installation manifests and ${actions} of their staff history entries`,
      );
    },
    async function down() {
      logging.warn('Not restoring cleared app installations, which were test data');
    },
  ),
  createAddColumnMigration('app_installation_manifests', 'changes', {
    type: 'text',
    maxlength: 65535,
    nullable: false,
  }),
);
