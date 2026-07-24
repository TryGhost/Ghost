const _ = require('lodash');
const errors = require('@tryghost/errors');
const tpl = require('@tryghost/tpl');
const MembersSSR = require('./members-ssr');
const db = require('../../data/db');
const MembersConfigProvider = require('./members-config-provider');
const {makeImporter, makeExporter} = require('./import-export');
const {resolveInlineThreshold} = require('./import-export/config');
const MembersStats = require('./stats/members-stats');
const memberJobs = require('./jobs');
const logging = require('@tryghost/logging');
const urlUtils = require('../../../shared/url-utils');
const settingsCache = require('../../../shared/settings-cache');
const config = require('../../../shared/config');
const models = require('../../models');
const {GhostMailer} = require('../mail');
const jobsService = require('../jobs');
const tiersService = require('../tiers');
const giftService = require('../gifts');
const VerificationTrigger = require('../verification-trigger');
const {verificationWebhookService} = require('../verification/verification-webhook-service');
const DatabaseInfo = require('@tryghost/database-info');
const settingsHelpers = require('../settings-helpers');
const RequestIntegrityTokenProvider = require('./request-integrity-token-provider');

const messages = {
    noLiveKeysInDevelopment: 'Cannot use live stripe keys in development. Please restart in production mode.',
    sslRequiredForStripe: 'Cannot run Ghost without SSL when Stripe is connected. Please update your url config to use "https://".',
    remoteWebhooksInDevelopment: 'Cannot use remote webhooks in development. See https://ghost.org/docs/webhooks/#stripe-webhooks for developing with Stripe.'
};

const ghostMailer = new GhostMailer();

const membersConfig = new MembersConfigProvider({
    settingsHelpers,
    settingsCache,
    urlUtils
});

const membersStats = new MembersStats({
    db: db,
    settingsCache: settingsCache,
    isSQLite: DatabaseInfo.isSQLite(db.knex)
});

let membersApi;
let verificationTrigger;

const buildImporterDeps = ({stripeAPIService}) => {
    // Required here rather than statically: the importer needs the custom fields
    // services, which boot builds before this one -- the same reason the exporter
    // reaches for them below.
    const customFields = require('../members-custom-fields');
    return {
        getTimezone: () => settingsCache.get('timezone'),
        // A getter rather than a value because the threshold is an operator
        // setting that can change between requests
        getInlineThreshold: () => resolveInlineThreshold(config.get('members:importer:inlineThreshold')),
        getMembersRepository: async () => {
            const api = await module.exports.api;
            return api.members;
        },
        getDefaultTier: () => {
            return tiersService.api.readDefaultTier();
        },
        getTierByName: async (name) => {
            const tiers = await tiersService.api.browse({
                filter: {
                    name
                }
            });

            if (tiers.data.length > 0) {
                // It is possible that there are multiple tiers with the same name so return the last one in the array -
                // `tiersService.api.browse` returns all tiers, but without any ordering applied, so we assume that
                // the last one in the array is the most recently created
                return tiers.data.pop();
            }

            return null;
        },
        getGiftService: () => giftService.service,
        sendEmail: ghostMailer.send.bind(ghostMailer),
        addJob: jobsService.addJob.bind(jobsService),
        knex: db.knex,
        urlFor: urlUtils.urlFor.bind(urlUtils),
        stripeAPIService,
        productRepository: membersApi.productRepository,
        customFields: {
            definitions: customFields.definitions,
            values: customFields.values
        }
    };
};

const initVerificationTrigger = () => {
    return new VerificationTrigger({
        getApiTriggerThreshold: () => _.get(config.get('hostSettings'), 'emailVerification.apiThreshold'),
        getAdminTriggerThreshold: () => _.get(config.get('hostSettings'), 'emailVerification.adminThreshold'),
        getImportTriggerThreshold: () => _.get(config.get('hostSettings'), 'emailVerification.importThreshold'),
        isVerified: () => config.get('hostSettings:emailVerification:verified') === true,
        isVerificationRequired: () => settingsCache.get('email_verification_required') === true,
        setVerificationRequired: value => settingsCache.set('email_verification_required', {value}),
        sendVerificationWebhook: verificationWebhookService.sendVerificationWebhook.bind(verificationWebhookService),
        membersStats,
        Settings: models.Settings,
        eventRepository: membersApi.events
    });
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

        module.exports.requestIntegrityTokenProvider = new RequestIntegrityTokenProvider({
            themeSecret: settingsCache.get('theme_session_secret'),
            tokenDuration: 1000 * 60 * 5
        });

        module.exports.ssr = MembersSSR({
            cookieSecure: urlUtils.isSSL(urlUtils.getSiteUrl()),
            cookieKeys: [settingsCache.get('theme_session_secret')],
            cookieName: 'ghost-members-ssr',
            cookiePath: urlUtils.getSubdir() || '/',
            getMembersApi: () => module.exports.api
        });

        if (!verificationTrigger) {
            verificationTrigger = initVerificationTrigger();
        }
        module.exports.verificationTrigger = verificationTrigger;

        const importerDeps = buildImporterDeps({stripeAPIService: stripeService.api});
        const membersCSVImporter = makeImporter(importerDeps);
        // The importer takes plain arguments and returns the domain outcome; callers build
        // the request and shape the response. importCSV decides inline vs deferred by load
        // (the endpoint); importInline always runs now (the Revue data import). This only
        // supplies the verification trigger, a members-service internal.
        module.exports.importCSV = (request) => membersCSVImporter.importCSV(request, verificationTrigger);
        module.exports.importInline = (request) => membersCSVImporter.importInline(request, verificationTrigger);

        // Constructed here rather than required statically: the exporter needs the
        // custom fields services, which boot builds before this one.
        const customFields = require('../members-custom-fields');
        module.exports.export = makeExporter({
            definitions: customFields.definitions,
            values: customFields.values
        });

        if (!env?.startsWith('testing')) {
            const membersMigrationJobName = 'members-migrations';
            if (!(await jobsService.hasExecutedSuccessfully(membersMigrationJobName))) {
                jobsService.addOneOffJob({
                    name: membersMigrationJobName,
                    offloaded: false,
                    job: stripeService.migrations.execute.bind(stripeService.migrations)
                });

                await jobsService.awaitOneOffCompletion(membersMigrationJobName);
            }
        }

        // Schedule daily cron job to clean expired comp subs
        memberJobs.scheduleExpiredCompCleanupJob();

        // Schedule daily cron job to clean expired tokens
        memberJobs.scheduleTokenCleanupJob();
    },
    contentGating: require('./content-gating'),

    // Create an "all active paid tiers" member shim for rendering gated content
    // without a logged-in member (post previews, gift-links reader path).
    createPaidMemberShim: require('./create-paid-member-shim').createPaidMemberShim,

    config: membersConfig,

    get api() {
        return membersApi;
    },

    ssr: null,
    verificationTrigger: null,

    requestIntegrityTokenProvider: null,

    stripeConnect: require('./stripe-connect'),

    importCSV: null,
    importInline: null,

    stats: membersStats,
    export: null
};

module.exports.middleware = require('./middleware');
