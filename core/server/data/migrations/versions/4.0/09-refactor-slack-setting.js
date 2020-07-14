const ObjectId = require('bson-objectid').default;
const {createIrreversibleMigration} = require('../../utils');

module.exports = createIrreversibleMigration(async (knex) => {
    const slackSetting = await knex('settings')
        .select('value')
        .where({
            key: 'slack'
        })
        .first();

    let slackUrl = '';
    let slackUsername = '';
    try {
        // example value that used to be stored in here:
        // value: [{
        //     "url":"https://hooks.slack.com/services/TC_REDACTED/B01_REDACTED/mk_REDACTED",
        //     "username":"Ghost"
        // }]
        const value = JSON.parse(slackSetting.value)[0];

        slackUrl = value.url;
        slackUsername = value.username;
    } catch (err) {
        slackUrl = '';
        slackUsername = 'Ghost';
    }

    const now = knex.raw('CURRENT_TIMESTAMP');

    await knex('settings')
        .insert({
            id: ObjectId.generate(),
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
            id: ObjectId.generate(),
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
});
