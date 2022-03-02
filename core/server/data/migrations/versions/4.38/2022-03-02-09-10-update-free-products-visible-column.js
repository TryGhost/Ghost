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
            await knex('products').update('visible', true).where('type', 'free');
        } catch (err) {
            logging.warn('portal_products setting is invalid - skipping migration');
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

            if (freeTier.visible) {
                if (existingSettingData.includes('free')) {
                    settingData = existingSettingData;
                } else {
                    settingData = existingSettingData.concat('free');
                }
            } else {
                settingData = existingSettingData.filter(value => value !== 'free');
            }

            logging.info(`Updating portal_plans to ${settingData}`);
            await knex('settings').update('value', JSON.stringify(settingData)).where('key', 'portal_plans');
        } catch (err) {
            logging.warn('portal_products setting is invalid - skipping migration');
            return;
        }
    }
);
