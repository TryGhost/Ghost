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

    async down() {
        // this is a major version migration, so there is no need for back compatibility
        // less code - less scenarios to think about
    }
};
