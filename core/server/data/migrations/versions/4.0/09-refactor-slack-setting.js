const {createTransactionalMigration} = require('../../utils');

module.exports = createTransactionalMigration(
    async function up(knex) {
        const slackSetting = await knex('settings')
            .select('value')
            .where({
                key: 'slack'
            })
            .first();

        let slackUrl = '';
        let slackUsername = '';
        try {
            const value = JSON.parse(slackSetting.value);

            slackUrl = value.url;
            slackUsername = value.username;
        } catch (err) {
            slackUrl = '';
            slackUsername = 'Ghost';
        }

        const now = await knex.raw('CURRENT_TIMESTAMP');

        await knex('settings')
            .insert({
                key: 'slack_url',
                group: 'slack',
                type: 'string',
                flags: null,
                value: slackUrl,
                created_by: 1,
                created_at: now,
                updated_by: 1,
                updated_at: now
            });

        await knex('settings')
            .insert({
                key: 'slack_username',
                group: 'slack',
                type: 'string',
                flags: null,
                value: slackUsername,
                created_by: 1,
                created_at: now,
                updated_by: 1,
                updated_at: now
            });

        await knex('settings')
            .where({
                key: 'slack'
            })
            .del();
    },

    async function down() {
        // this is a major version migration, so there is no need for back compatibility
        // less code - less scenarios to think about
    }
);
