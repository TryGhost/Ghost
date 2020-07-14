const logging = require('../../../../../shared/logging');
const {createIrreversibleMigration} = require('../../utils');

module.exports = createIrreversibleMigration(async (knex) => {
    const unsplashSetting = await knex('settings')
        .select('value')
        .where({
            key: 'unsplash'
        })
        .first();

    let isActive;
    try {
        const value = JSON.parse(unsplashSetting.value);
        isActive = typeof value.isActive === 'boolean' ? value.isActive : true;
    } catch (err) {
        logging.warn(`Wasn't able to parse 'unsplash' setting: ${unsplashSetting.value}, falling back to: 'true'`);
        isActive = true;
    }

    logging.info(`Updating 'unsplash' setting to: ${isActive}`);

    await knex('settings')
        .update({
            group: 'unsplash',
            type: 'boolean',
            flags: null,
            value: isActive.toString()
        })
        .where({
            key: 'unsplash'
        });
});
