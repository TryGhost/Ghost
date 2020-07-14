module.exports = {
    config: {
        transaction: true
    },

    async up({transacting: knex}) {
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

        await knex('settings')
            .update({
                group: 'slack',
                type: 'string',
                flags: null,
                value: slackUrl
            })
            .where({
                key: 'slack_url'
            });

        await knex('settings')
            .update({
                group: 'slack',
                type: 'string',
                flags: null,
                value: slackUsername
            })
            .where({
                key: 'slack_username'
            });

        await knex('settings')
            .where({
                key: 'slack'
            })
            .del();
    },

    async down({transacting: knex}) {
        const slackUrlSetting = await knex('settings')
            .select('value')
            .where({
                key: 'slack_url'
            })
            .first();

        const slackUsernameSetting = await knex('settings')
            .select('value')
            .where({
                key: 'slack_username'
            })
            .first();

        const now = await knex.raw('CURRENT_TIMESTAMP');

        const url = slackUrlSetting && typeof slackUrlSetting.value === 'string' ? slackUrlSetting.value : '';
        const username = slackUsernameSetting && typeof slackUsernameSetting.value === 'string' ? slackUsernameSetting.value : 'Ghost';

        await knex('settings')
            .insert({
                key: 'slack',
                group: 'slack',
                type: 'object',
                flags: null,
                value: JSON.stringify({url, username}),
                created_by: 1,
                created_at: now,
                updated_by: 1,
                updated_at: now
            });

        await knex('settings')
            .whereIn('key', [
                'slack_url',
                'slack_username'
            ])
            .del();
    }
};
