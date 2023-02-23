const logging = require('@tryghost/logging');
const {createTransactionalMigration} = require('../../utils');

// Set outbound_link_tagging to the current value of members_track_sources
module.exports = createTransactionalMigration(
    async function up(connection) {
        const reuseValueOfSetting = await connection('settings')
            .where('key', '=', 'members_track_sources')
            .first();

        if (!reuseValueOfSetting) {
            logging.warn(`Skipped setting outbound_link_tagging to current value of members_track_sources - members_track_sources not found`);
            return;
        }

        const affectedRows = await connection('settings')
            .update({
                value: reuseValueOfSetting.value
            })
            .where('key', '=', 'outbound_link_tagging');

        if (affectedRows === 1) {
            logging.info(`Set outbound_link_tagging to ${reuseValueOfSetting.value} (current members_track_sources value)`);
        } else {
            logging.warn(`Tried setting outbound_link_tagging to ${reuseValueOfSetting.value} — ${affectedRows} changes`);
        }
    },
    async function down() {
        // no-op: we don't need to change it back
    }
);
