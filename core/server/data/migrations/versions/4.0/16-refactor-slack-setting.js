const ObjectId = require('bson-objectid').default;
const {createIrreversibleMigration} = require('../../utils');
const logging = require('../../../../../shared/logging');

module.exports = createIrreversibleMigration(async (knex) => {
    logging.info('Populating slack_url and slack_username setting values');

    const slackURLSetting = await knex('settings')
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

    if (slackURLSetting && slackUsernameSetting) {
        logging.warn('slack_url and slack_username settings already exist');
        return;
    }

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

        slackUrl = value.url || '';
        slackUsername = value.username || 'Ghost';
    } catch (err) {
        slackUrl = '';
        slackUsername = 'Ghost';
    }

    const now = knex.raw('CURRENT_TIMESTAMP');

    if (!slackURLSetting) {
        logging.info(`Populating slack_url setting with value: ${slackUrl}`);

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
    }

    if (!slackUsernameSetting) {
        logging.info(`Populating slack_username setting with value: ${slackUsername}`);

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
    }

    logging.info(`Removing slack setting`);

    await knex('settings')
        .where({
            key: 'slack'
        })
        .del();
});
