const errors = require('@tryghost/errors');
const tpl = require('@tryghost/tpl');
const MembersSSR = require('@tryghost/members-ssr');
const db = require('../../data/db');
const MembersConfigProvider = require('./config');
const MembersCSVImporter = require('@tryghost/members-importer');
const MembersStats = require('./stats/members-stats');
const createMembersApiInstance = require('./api');
const createMembersSettingsInstance = require('./settings');
const logging = require('@tryghost/logging');
const urlUtils = require('../../../shared/url-utils');
const labsService = require('../../../shared/labs');
const settingsCache = require('../../../shared/settings-cache');
const config = require('../../../shared/config');
const models = require('../../models');
const ghostVersion = require('@tryghost/version');
const _ = require('lodash');
const {GhostMailer} = require('../mail');
const jobsService = require('../jobs');

const messages = {
    noLiveKeysInDevelopment: 'Cannot use live stripe keys in development. Please restart in production mode.',
    sslRequiredForStripe: 'Cannot run Ghost without SSL when Stripe is connected. Please update your url config to use "https://".',
    remoteWebhooksInDevelopment: 'Cannot use remote webhooks in development. See https://ghost.org/docs/webhooks/#stripe-webhooks for developing with Stripe.',
    emailVerificationNeeded: `We're hard at work processing your import. To make sure you get great deliverability on a list of that size, we'll need to enable some extra features for your account. A member of our team will be in touch with you by email to review your account make sure everything is configured correctly so you're ready to go.`,
    emailVerificationEmailMessage: `Email verification needed for site: {siteUrl}, just imported: {importedNumber} members.`
};

// Bind to settings.edited to update systems based on settings changes, similar to the bridge and models/base/listeners
const events = require('../../lib/common/events');

const ghostMailer = new GhostMailer();

const membersConfig = new MembersConfigProvider({
    config,
    settingsCache,
    urlUtils,
    logging,
    ghostVersion
});

let membersApi;
let membersSettings;

function reconfigureMembersAPI() {
    const reconfiguredMembersAPI = createMembersApiInstance(membersConfig);
    reconfiguredMembersAPI.bus.on('ready', function () {
        membersApi = reconfiguredMembersAPI;
    });
    reconfiguredMembersAPI.bus.on('error', function (err) {
        logging.error(err);
    });
}

/**
 * @description Calculates threshold based on following formula
 * Threshold = max{[current number of members], [volume threshold]}
 *
 * @returns {Promise<number>}
 */
const fetchImportThreshold = async () => {
    const membersTotal = await membersService.stats.getTotalMembers();
    const volumeThreshold = _.get(config.get('hostSettings'), 'emailVerification.importThreshold') || Infinity;
    const threshold = Math.max(membersTotal, volumeThreshold);

    return threshold;
};

const membersImporter = new MembersCSVImporter({
    storagePath: config.getContentPath('data'),
    getTimezone: () => settingsCache.get('timezone'),
    getMembersApi: () => membersService.api,
    sendEmail: ghostMailer.send.bind(ghostMailer),
    isSet: labsService.isSet.bind(labsService),
    addJob: jobsService.addJob.bind(jobsService),
    knex: db.knex,
    urlFor: urlUtils.urlFor.bind(urlUtils),
    fetchThreshold: fetchImportThreshold
});

const startEmailVerification = async (importedNumber) => {
    const isVerifiedEmail = config.get('hostSettings:emailVerification:verified') === true;

    if ((!isVerifiedEmail)) {
        // Only trigger flag change and escalation email the first time
        if (settingsCache.get('email_verification_required') !== true) {
            await models.Settings.edit([{
                key: 'email_verification_required',
                value: true
            }], {context: {internal: true}});

            const escalationAddress = config.get('hostSettings:emailVerification:escalationAddress');
            const fromAddress = config.get('user_email');

            if (escalationAddress) {
                ghostMailer.send({
                    subject: 'Email needs verification',
                    html: tpl(messages.emailVerificationEmailMessage, {
                        importedNumber,
                        siteUrl: urlUtils.getSiteUrl()
                    }),
                    forceTextContent: true,
                    from: fromAddress,
                    to: escalationAddress
                });
            }
        }

        throw new errors.ValidationError({
            message: tpl(messages.emailVerificationNeeded)
        });
    }
};

const processImport = async (options) => {
    const result = await membersImporter.process(options);
    const freezeTriggered = result.meta.freeze;
    const importSize = result.meta.originalImportSize;
    delete result.meta.freeze;
    delete result.meta.originalImportSize;

    if (freezeTriggered) {
        await startEmailVerification(importSize);
    }

    return result;
};

const debouncedReconfigureMembersAPI = _.debounce(reconfigureMembersAPI, 600);

// Bind to events to automatically keep subscription info up-to-date from settings
events.on('settings.edited', function updateSettingFromModel(settingModel) {
    if (![
        'members_signup_access',
        'members_from_address',
        'members_support_address',
        'members_reply_address',
        'stripe_publishable_key',
        'stripe_secret_key',
        'stripe_product_name',
        'stripe_plans',
        'stripe_connect_publishable_key',
        'stripe_connect_secret_key',
        'stripe_connect_livemode',
        'stripe_connect_display_name',
        'stripe_connect_account_id'
    ].includes(settingModel.get('key'))) {
        return;
    }

    debouncedReconfigureMembersAPI();
});

const membersService = {
    async init() {
        const env = config.get('env');
        const paymentConfig = membersConfig.getStripePaymentConfig();

        if (env !== 'production') {
            if (!process.env.WEBHOOK_SECRET && membersConfig.isStripeConnected()) {
                process.env.WEBHOOK_SECRET = 'DEFAULT_WEBHOOK_SECRET';
                logging.warn(tpl(messages.remoteWebhooksInDevelopment));
            }

            if (paymentConfig && paymentConfig.secretKey.startsWith('sk_live')) {
                throw new errors.IncorrectUsageError(tpl(messages.noLiveKeysInDevelopment));
            }
        } else {
            const siteUrl = urlUtils.getSiteUrl();
            if (!/^https/.test(siteUrl) && membersConfig.isStripeConnected()) {
                throw new errors.IncorrectUsageError(tpl(messages.sslRequiredForStripe));
            }
        }
    },
    contentGating: require('./content-gating'),

    config: membersConfig,

    get api() {
        if (!membersApi) {
            membersApi = createMembersApiInstance(membersConfig);

            membersApi.bus.on('error', function (err) {
                logging.error(err);
            });
        }
        return membersApi;
    },

    get settings() {
        if (!membersSettings) {
            membersSettings = createMembersSettingsInstance(membersConfig);
        }
        return membersSettings;
    },

    ssr: MembersSSR({
        cookieSecure: urlUtils.isSSL(urlUtils.getSiteUrl()),
        cookieKeys: [settingsCache.get('theme_session_secret')],
        cookieName: 'ghost-members-ssr',
        cookieCacheName: 'ghost-members-ssr-cache',
        getMembersApi: () => membersService.api
    }),

    stripeConnect: require('./stripe-connect'),

    processImport: processImport,

    stats: new MembersStats({
        db: db,
        settingsCache: settingsCache,
        isSQLite: config.get('database:client') === 'sqlite3'
    })
};

module.exports = membersService;
module.exports.middleware = require('./middleware');
