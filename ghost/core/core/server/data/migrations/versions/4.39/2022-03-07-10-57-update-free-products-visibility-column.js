const logging = require('@tryghost/logging');
const {createTransactionalMigration} = require('../../utils');

module.exports = createTransactionalMigration(
    async function up(knex) {
        const portalPlanSetting = await knex('settings').select('value').where('key', 'portal_plans').first();

        if (!portalPlanSetting) {
            logging.warn('Could not find portal_plans setting - skipping migration');
            return;
        }

        try {
            const settingData = JSON.parse(portalPlanSetting.value);

            if (!settingData.includes('free')) {
                logging.warn(`portal_plans does not include "free" - skipping migration`);
                return;
            }

            logging.info(`Updating free products to visible`);
            await knex('products').update('visibility', 'public').where('type', 'free');
        } catch (err) {
            logging.error(err);
            logging.warn('portal_plans setting is invalid - skipping migration');
            return;
        }
    },
    async function down(knex) {
        const freeTier = await knex('products').select('id').where('type', 'free').first();
        const portalPlanSetting = await knex('settings').select('value').where('key', 'portal_plans').first();

        if (!freeTier) {
            logging.info('Free tier is not visible, not updating portal_plans');
            return;
        }

        if (!portalPlanSetting) {
            logging.warn('Could not find portal_plans setting - skipping migration');
            return;
        }

        try {
            const existingSettingData = JSON.parse(portalPlanSetting.value);
            let settingData;

            if (freeTier.visibility === 'public') {
                if (existingSettingData.includes('free')) {
                    logging.info('portal_plans setting already contains "free" - skipping update');
                    return;
                } else {
                    settingData = JSON.stringify(existingSettingData.concat('free'));
                }
            } else {
                settingData = JSON.stringify(existingSettingData.filter(value => value !== 'free'));
            }

            logging.info(`Updating portal_plans to ${settingData}`);
            await knex('settings').update('value', settingData).where('key', 'portal_plans');
        } catch (err) {
            logging.error(err);
            logging.warn('portal_plans setting is invalid - skipping migration');
            return;
        }
    }
);
