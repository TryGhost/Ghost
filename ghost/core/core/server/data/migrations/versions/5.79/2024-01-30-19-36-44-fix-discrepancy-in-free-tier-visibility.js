const {createTransactionalMigration} = require('../../utils');
const logging = require('@tryghost/logging');

module.exports = createTransactionalMigration(
    async function up(knex) {
        const portalPlansRaw = await knex('settings').select('value').where('key', 'portal_plans').first();
        const freeTier = await knex('products').select('visibility').where('type', 'free').first();

        if (!portalPlansRaw || !freeTier) {
            logging.warn('Could not read `portal_plans` setting or `visibility` of the free tier - skipping migration');
            return;
        }

        let portalPlans;
        try {
            portalPlans = JSON.parse(portalPlansRaw.value);

            if (!portalPlans || !Array.isArray(portalPlans)) {
                logging.warn('`portal_plans` setting is not valid - skipping migration');
                return;
            }
        } catch (err) {
            logging.warn('Could not parse `portal_plans` setting - skipping migration');
            return;
        }

        if (portalPlans.includes('free') && freeTier.visibility === 'none') {
            logging.info('`portal_plans` setting contains "free", but free tier is not visible - updating free tier visibility to public');
            await knex('products').update('visibility', 'public').where('type', 'free');
            return;
        }

        if (!portalPlans.includes('free') && freeTier.visibility === 'public') {
            logging.info('`portal_plans` setting does not contain "free", but free tier is visible - updating free tier visibility to none');
            await knex('products').update('visibility', 'none').where('type', 'free');
            return;
        }
    },

    async function down() {
        // noop, as this is a data discrepancy fix
    }
);
