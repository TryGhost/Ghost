const logging = require('@tryghost/logging');
const {createTransactionalMigration} = require('../../utils');

// Set email_track_clicks to the current value of email_track_opens
module.exports = createTransactionalMigration(
    async function up(connection) {
        const reuseValueOfSetting = await connection('settings')
            .where('key', '=', 'email_track_opens')
            .first();

        if (!reuseValueOfSetting) {
            logging.warn(`Skipped setting email_track_clicks to current value of email_track_opens - email_track_opens not found`);
            return;
        }

        const affectedRows = await connection('settings')
            .update({
                value: reuseValueOfSetting.value
            })
            .where('key', '=', 'email_track_clicks');

        if (affectedRows === 1) {
            logging.info(`Set email_track_clicks to ${reuseValueOfSetting.value} (current email_track_opens value)`);
        } else {
            logging.warn(`Tried setting email_track_clicks to ${reuseValueOfSetting.value} — ${affectedRows} changes`);
        }
    },
    async function down() {
        // no-op: we don't need to change it back
    }
);
