const ObjectId = require('bson-objectid');
const logging = require('@tryghost/logging');
const {createTransactionalMigration} = require('../../utils');
const {slugify} = require('@tryghost/string');

const newsletterPrefixRegexp = /^newsletter_/;

function forceBoolean(string) {
    return string === 'true';
}

// This also contains the default settings from core/server/data/schema/default-settings/default-settings.json
// The default settings are needed to avoid an edge case where this migration runs before the settings are populated
const settingsConfig = [
    {setting: 'title', default: 'Ghost'},
    {setting: 'description', default: ''},
    {setting: 'newsletter_body_font_category', default: 'sans_serif'},
    {setting: 'newsletter_footer_content', default: ''},
    {setting: 'newsletter_header_image', default: null},
    {setting: 'newsletter_show_badge', default: 'true', modifier: forceBoolean},
    {setting: 'newsletter_show_feature_image', default: 'true', modifier: forceBoolean},
    {setting: 'newsletter_show_header_icon', default: 'true', modifier: forceBoolean},
    {setting: 'newsletter_show_header_title', default: 'true', modifier: forceBoolean},
    {setting: 'newsletter_title_alignment', default: 'center'},
    {setting: 'newsletter_title_font_category', default: 'sans_serif'}
];

module.exports = createTransactionalMigration(
    async function up(knex) {
        // Make sure the newsletter table is empty
        const newsletters = await knex('newsletters').count('*', {as: 'total'});

        if (newsletters[0].total !== 0) {
            logging.info('Skipping adding the default newsletter - There is already at least one newsletter');
            return;
        }

        // Get all settings in one query
        const settings = await knex('settings')
            .whereIn('key', settingsConfig.map(config => config.setting))
            .select(['key', 'value']);

        // Create a settings map taking into account the default value
        const settingsMap = {};
        // eslint-disable-next-line no-restricted-syntax
        for (const config of settingsConfig) {
            const setting = settings.find(s => s.key === config.setting);
            if (setting) {
                settingsMap[config.setting] = setting.value;
            } else {
                settingsMap[config.setting] = config.default;
            }
            if (config.modifier) {
                settingsMap[config.setting] = config.modifier(settingsMap[config.setting]);
            }
        }

        const newsletter = {
            id: ObjectId().toHexString(),
            name: settingsMap.title,
            description: settingsMap.description,
            slug: slugify(settingsMap.title),
            sender_name: settingsMap.title,
            sender_email: null,
            sender_reply_to: 'newsletter',
            status: 'active',
            visibility: 'members',
            subscribe_on_signup: true,
            sort_order: 0
        };

        // Special case for the design settings because we are getting rid of the `newsletter_` prefix
        const designSettings = settingsConfig.filter(config => newsletterPrefixRegexp.test(config.setting));
        // eslint-disable-next-line no-restricted-syntax
        for (const config of designSettings) {
            newsletter[config.setting.replace(newsletterPrefixRegexp, '')] = settingsMap[config.setting];
        }

        logging.info('Adding the default newsletter');

        await knex('newsletters').insert(newsletter);
    }, async function down() {
        // Noop because we don't want to reset the default newsletter values
        logging.info(`Skipping newsletter design settings backfill rollack - not needed`);
        return Promise.resolve();
    }
);
