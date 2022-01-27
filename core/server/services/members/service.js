const _ = require('lodash');
const errors = require('@tryghost/errors');
const tpl = require('@tryghost/tpl');
const MembersSSR = require('@tryghost/members-ssr');
const db = require('../../data/db');
const MembersConfigProvider = require('./config');
const MembersCSVImporter = require('@tryghost/members-importer');
const MembersStats = require('./stats/members-stats');
const createMembersSettingsInstance = require('./settings');
const logging = require('@tryghost/logging');
const urlUtils = require('../../../shared/url-utils');
const labsService = require('../../../shared/labs');
const settingsCache = require('../../../shared/settings-cache');
const config = require('../../../shared/config');
const models = require('../../models');
const {GhostMailer} = require('../mail');
const jobsService = require('../jobs');
const VerificationTrigger = require('@tryghost/verification-trigger');

const messages = {
    noLiveKeysInDevelopment: 'Cannot use live stripe keys in development. Please restart in production mode.',
    sslRequiredForStripe: 'Cannot run Ghost without SSL when Stripe is connected. Please update your url config to use "https://".',
    remoteWebhooksInDevelopment: 'Cannot use remote webhooks in development. See https://ghost.org/docs/webhooks/#stripe-webhooks for developing with Stripe.',
    emailVerificationNeeded: `We're hard at work processing your import. To make sure you get great deliverability on a list of that size, we'll need to enable some extra features for your account. A member of our team will be in touch with you by email to review your account make sure everything is configured correctly so you're ready to go.`,
    emailVerificationEmailMessage: `Email verification needed for site: {siteUrl}, just imported: {importedNumber} members.`
};

const ghostMailer = new GhostMailer();

const membersConfig = new MembersConfigProvider({
    config,
    settingsCache,
    urlUtils
});

const membersStats = new MembersStats({
    db: db,
    settingsCache: settingsCache,
    isSQLite: config.get('database:client') === 'sqlite3'
});

let membersApi;
let membersSettings;
let verificationTrigger;

const membersImporter = new MembersCSVImporter({
    storagePath: config.getContentPath('data'),
    getTimezone: () => settingsCache.get('timezone'),
    getMembersApi: () => module.exports.api,
    sendEmail: ghostMailer.send.bind(ghostMailer),
    isSet: labsService.isSet.bind(labsService),
    addJob: jobsService.addJob.bind(jobsService),
    knex: db.knex,
    urlFor: urlUtils.urlFor.bind(urlUtils)
});

const processImport = async (options) => {
    const result = await membersImporter.process(options);
    const importSize = result.meta.originalImportSize;
    delete result.meta.originalImportSize;

    const importThreshold = await verificationTrigger.getImportThreshold();
    if (importThreshold > importSize) {
        await verificationTrigger.startVerificationProcess({
            amountImported: importSize,
            throwOnTrigger: true
        });
    }

    return result;
};

module.exports = {
    async init() {
        const stripeService = require('../stripe');
        const createMembersApiInstance = require('./api');
        const env = config.get('env');

        // @TODO Move to stripe service
        if (env !== 'production') {
            if (stripeService.api.configured && stripeService.api.mode === 'live') {
                throw new errors.IncorrectUsageError({
                    message: tpl(messages.noLiveKeysInDevelopment)
                });
            }
        } else {
            const siteUrl = urlUtils.getSiteUrl();
            if (!/^https/.test(siteUrl) && stripeService.api.configured) {
                throw new errors.IncorrectUsageError({
                    message: tpl(messages.sslRequiredForStripe)
                });
            }
        }
        if (!membersApi) {
            membersApi = createMembersApiInstance(membersConfig);

            membersApi.bus.on('error', function (err) {
                logging.error(err);
            });
        }

        verificationTrigger = new VerificationTrigger({
            configThreshold: _.get(config.get('hostSettings'), 'emailVerification.importThreshold'),
            isVerified: () => config.get('hostSettings:emailVerification:verified') === true,
            isVerificationRequired: () => settingsCache.get('email_verification_required') === true,
            sendVerificationEmail: ({subject, message, amountImported}) => {
                const escalationAddress = config.get('hostSettings:emailVerification:escalationAddress');
                const fromAddress = config.get('user_email');
    
                if (escalationAddress) {
                    this._ghostMailer.send({
                        subject,
                        html: tpl(message, {
                            amountImported,
                            siteUrl: this._urlUtils.getSiteUrl()
                        }),
                        forceTextContent: true,
                        from: fromAddress,
                        to: escalationAddress
                    });
                }
            },
            membersStats,
            Settings: models.Settings,
            eventRepository: membersApi.events
        });

        (async () => {
            try {
                const collection = await models.SingleUseToken.fetchAll();
                await collection.invokeThen('destroy');
            } catch (err) {
                logging.error(err);
            }
        })();

        try {
            await stripeService.migrations.execute();
        } catch (err) {
            logging.error(err);
        }
    },
    contentGating: require('./content-gating'),

    config: membersConfig,

    get api() {
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
        getMembersApi: () => module.exports.api
    }),

    stripeConnect: require('./stripe-connect'),

    processImport: processImport,

    stats: membersStats

};
module.exports.middleware = require('./middleware');
