const logging = require('@tryghost/logging');
const BookshelfMilestoneRepository = require('./bookshelf-milestone-repository');
const MilestoneQueries = require('./milestone-queries');
const MilestonesService = require('./milestones-service');

const JOB_TIMEOUT = 1000 * 60 * 60 * 24 * (Math.floor(Math.random() * 4)); // 0 - 4 days;

/**
 * @param {object} deps
 * @param {object} deps.models
 * @param {object} deps.domainEvents
 * @param {import('knex').Knex} deps.knex
 * @param {object} deps.settingsCache
 * @param {() => object} deps.getMilestonesConfig
 */
module.exports = function createMilestonesService({models, domainEvents, knex, settingsCache, getMilestonesConfig}) {
    const milestonesConfig = getMilestonesConfig();
    const repository = new BookshelfMilestoneRepository({
        DomainEvents: domainEvents,
        MilestoneModel: models.Milestone
    });

    const queries = new MilestoneQueries({
        db: {knex},
        minDaysSinceImported: milestonesConfig?.minDaysSinceImported || 7
    });

    const api = new MilestonesService({
        repository,
        milestonesConfig,
        queries
    });

    const getStripeLiveEnabled = () => {
        const stripeConnect = settingsCache.get('stripe_connect_publishable_key');
        const stripeKey = settingsCache.get('stripe_publishable_key');

        // Allow Stripe test key when in development mode
        const stripeLiveRegex = process.env.NODE_ENV === 'development' ? /pk_test_/ : /pk_live_/;

        if (stripeConnect && stripeConnect.match(stripeLiveRegex)) {
            return true;
        } else if (stripeKey && stripeKey.match(stripeLiveRegex)) {
            return true;
        }

        return false;
    };

    const service = {
        api,

        async init() {},

        async run() {
            const members = await api.checkMilestones('members');
            let arr;

            if (getStripeLiveEnabled()) {
                arr = await api.checkMilestones('arr');
            }

            return {
                members,
                arr
            };
        },

        async scheduleRun(customTimeout) {
            if (process.env.NODE_ENV === 'development') {
                // Run the job within 5sec after boot when in local development mode
                customTimeout = 5000;
            }

            const timeOut = customTimeout || JOB_TIMEOUT;

            const today = new Date();
            const msNow = today.getMilliseconds();
            const newMs = msNow + timeOut;
            const jobDate = today.setMilliseconds(newMs);

            logging.info(`Running milestone emails job on ${new Date(jobDate).toString()}`);

            return new Promise((resolve) => {
                setTimeout(async () => {
                    const result = await service.run();
                    return resolve(result);
                }, timeOut);
            });
        },

        async initAndRun(customTimeout) {
            await service.init();

            return service.scheduleRun(customTimeout);
        }
    };

    return service;
};
