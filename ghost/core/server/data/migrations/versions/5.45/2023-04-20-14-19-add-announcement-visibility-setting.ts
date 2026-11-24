import logging from '@tryghost/logging';
import {
  createTransactionalMigration,
  combineTransactionalMigrations,
  addSetting,
} from '../../utils';

const visibilitySettingCleanup = createTransactionalMigration(
  async function up(knex) {
    const existingSetting = await knex('settings').where('key', '=', 'announcement_visibility');

    if (existingSetting.length) {
      logging.info(`Deleting setting: "announcement_visibility"`);

      await knex('settings').where('key', '=', 'announcement_visibility').del();
    } else {
      logging.info(
        `Setting: "announcement_visibility", was not found in the database. Skipping removal`,
      );
    }
  },
  async function down() {
    // no-op: we don't want to recreate "announcement_visibility" setting
  },
);

export default combineTransactionalMigrations(
  visibilitySettingCleanup,
  addSetting({
    key: 'announcement_visibility',
    value: '[]',
    type: 'array',
    group: 'announcement',
  }),
);
