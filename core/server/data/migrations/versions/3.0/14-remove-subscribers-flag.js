const logging = require('@tryghost/logging');
const {createIrreversibleMigration} = require('../../utils');

module.exports = createIrreversibleMigration(async (knex) => {
    let result = await knex('settings')
        .where('key', '=', 'labs')
        .select('value');

    if (!result || !result[0]) {
        logging.warn(`Could not find labs setting`);
        result = [{}];
    }

    const labs = JSON.parse(result[0].value);

    labs.members = !!labs.members || !!labs.subscribers;

    logging.info(`Updating labs setting removing subscribers (was ${labs.subscribers}) settings members to ${labs.members}`);
    labs.subscribers = undefined;

    await knex('settings')
        .where('key', '=', 'labs')
        .update('value', JSON.stringify(labs));
});
