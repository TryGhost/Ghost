const logging = require('@tryghost/logging');
const {createTransactionalMigration} = require('../../utils');
const MembersConfigProvider = require('../../../../services/members/MembersConfigProvider');
const settingsCache = require('../../../../../shared/settings-cache');
const config = require('../../../../../shared/config');

// members_allow_free_signup was migrated to members_signup_access in 4.3/08-migrate-members-signup-setting
// using a direct binary migration of true=all and false=invite based on new setting behaviour matching the
// old setting. That was innacurate and the behaviour is changing to a proper invite-only toggle which
// requires a more nuanced migration.
//
// 'all' - no need to change, matches expected behaviour
// 'invite' - change to 'all' based on members usage
// 'none' - no need to change, it's a completely new option that wasn't previously migrated to
//
// For the majority of cases 'invite' should actually be 'all'. The true invite-only case is:
// - stripe not configured
// - portal configured with no plans
//
// When switching from signup access from 'invite' to 'all' we also need to remove the 'free' plan from
// portal settings to avoid paid-only sites suddenly offering free plan signups

module.exports = createTransactionalMigration(
    async function up(connection) {
        const currentSetting = await connection('settings')
            .where('key', 'members_signup_access')
            .select('value')
            .first();

        if (!currentSetting) {
            logging.info('Skipping update of members_signup_access setting. Does not exist');
            return;
        }

        if (currentSetting.value !== 'invite') {
            logging.info(`Skipping update of members_signup_access setting. Not set to 'invite', keeping current value`);
            return;
        }

        const membersConfig = new MembersConfigProvider({
            settingsCache,
            config
        });

        const hasStripe = membersConfig.isStripeConnected();

        if (!hasStripe) {
            logging.info('Skipping update of members_signup_access setting. Stripe is not configured, staying as invite-only');
            return;
        }

        const portalPlansSetting = await connection('settings')
            .where('key', 'portal_plans')
            .select('value')
            .first();

        if (!portalPlansSetting) {
            // shouldn't be reachable because members_signup_access wouldn't exist either for a clean install but better to be safe
            logging.info('Skipping update of members_signup_access setting. Portal plans setting does not exist');
            return;
        }

        let currentPlans = JSON.parse(portalPlansSetting.value);

        if (currentPlans.length === 0) {
            logging.info('Skipping update of members_signup_access setting. Portal configured as invite-only, staying as invite-only');
            return;
        }

        logging.info(`Updating members_signup_access setting to 'all'`);
        await connection('settings')
            .where('key', 'members_signup_access')
            .update({value: 'all'});

        if (currentPlans.includes('free')) {
            currentPlans.splice(currentPlans.indexOf('free'), 1);

            logging.info(`Removing free plan from portal plans setting to match "allow free members signup = false" behaviour`);
            await connection('settings')
                .where('key', 'portal_plans')
                .update({value: JSON.stringify(currentPlans)});
        }
    },

    async function down(connection) {
        const accessSetting = await connection('settings')
            .where('key', 'members_signup_access')
            .select('value')
            .first();

        if (!accessSetting) {
            logging.info('Skipping rollback of members_signup_access setting. Does not exist.');
            return;
        }

        if (accessSetting.value !== 'all') {
            logging.info(`Skipping rollback of members_signup_access setting. Not set 'all', nothing to roll back`);
            return;
        }

        const portalPlansSetting = await connection('settings')
            .where('key', 'portal_plans')
            .select('value')
            .first();

        const membersConfig = new MembersConfigProvider({
            settingsCache,
            config
        });

        const hasStripe = membersConfig.isStripeConnected();

        if (hasStripe && JSON.parse(portalPlansSetting.value).length === 0) {
            logging.info(`Reverting members_signup_access setting to 'invite'`);
            await connection('settings')
                .where('key', 'members_signup_access')
                .update({value: 'invite'});

            // free plan removal is not rolled back because we can't be 100% sure of it's previous state
            // this won't have any detrimental effect because the free plan was already hidden by the
            // "allow free members signup = false" or 4.3.x "members_signup_access = 'invite'" settings
        }

        logging.info(`Skipping rollback of members_signup_access setting. Value did not match \`up\` requirements`);
    }
);
