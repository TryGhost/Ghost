const logging = require('@tryghost/logging');
const {createTransactionalMigration} = require('../../utils');

// Set email_track_clicks to the current value of email_track_opens
module.exports = createTransactionalMigration(
    async function up(connection) {
        const reuseValueOfSetting = await connection('settings')
            .where('key', '=', 'email_track_opens')
            .first();

        if (!reuseValueOfSetting.value) {
            logging.warn(`Skipped setting email_track_clicks to current value of email_track_opens - email_track_opens not found`);
            return;
        }

        logging.info(`Setting email_track_clicks to ${reuseValueOfSetting.value} (current email_track_opens value)`);

        await connection('settings')
            .update({
                value: reuseValueOfSetting.value
            })
            .where('key', '=', 'email_track_clicks');
    },
    async function down() {
        // no-op: we don't need to change it back
    }
);
