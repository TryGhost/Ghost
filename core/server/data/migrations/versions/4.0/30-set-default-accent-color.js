const logging = require('@tryghost/logging');
const {createTransactionalMigration} = require('../../utils');

module.exports = createTransactionalMigration(async function up(knex) {
    const existingSetting = await knex.select('*').from('settings').where('key', 'accent_color').first();

    if (!existingSetting) {
        logging.warn(`Not setting value of accent_color, setting does not exist`);
        return;
    }

    if (existingSetting.value) {
        logging.warn(`Not setting value of accent_color, value of ${existingSetting.value} already present`);
        return;
    }

    logging.info('Setting value of accent_color to default #15171A');
    await knex('settings').update('value', '#15171A').where('key', 'accent_color');
}, async function down() {
    // noop
});
