const logging = require('@tryghost/logging');
const {createTransactionalMigration} = require('../../utils');

module.exports = createTransactionalMigration(
    async function up(knex) {
        const userRows = await knex('users').select('accessibility').whereNotNull('accessibility');
        const hasLaunchComplete = userRows.find((user) => {
            try {
                const userAccessibility = JSON.parse(user.accessibility);
                return userAccessibility.launchComplete;
            } catch (e) {
                return false;
            }
        });
        if (hasLaunchComplete) {
            logging.info('Updating setting: "editor_is_launch_complete" to "true"');
            await knex('settings')
                .where({
                    key: 'editor_is_launch_complete'
                })
                .update({
                    value: 'true'
                });
        } else {
            logging.warn('Skipped setting update: "editor_is_launch_complete" setting - is already correct value!');
        }
    },

    async function down(knex) {
        logging.info('Reverting setting: "editor_is_launch_complete" - to "false"');
        await knex('settings')
            .where({
                key: 'editor_is_launch_complete'
            })
            .update({
                value: 'false'
            });
    }
);
