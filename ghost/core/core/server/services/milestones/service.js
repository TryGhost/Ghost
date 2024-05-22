const DomainEvents = require('@tryghost/domain-events');
const logging = require('@tryghost/logging');
const models = require('../../models');
const BookshelfMilestoneRepository = require('./BookshelfMilestoneRepository');

const JOB_TIMEOUT = 1000 * 60 * 60 * 24 * (Math.floor(Math.random() * 4)); // 0 - 4 days;

const getStripeLiveEnabled = () => {
    const settingsCache = require('../../../shared/settings-cache');
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

module.exports = {
    /** @type {import('@tryghost/milestones/lib/MilestonesService')} */
    api: null,

    /**
     * @returns {Promise<void>}
     */
    async init() {
        if (!this.api) {
            const db = require('../../data/db');
            const MilestoneQueries = require('./MilestoneQueries');

            const {MilestonesService} = require('@tryghost/milestones');
            const config = require('../../../shared/config');
            const milestonesConfig = config.get('milestones');

            const repository = new BookshelfMilestoneRepository({
                DomainEvents,
                MilestoneModel: models.Milestone
            });

            const queries = new MilestoneQueries({
                db,
                minDaysSinceImported: milestonesConfig?.minDaysSinceImported || 7
            });

            this.api = new MilestonesService({
                repository,
                milestonesConfig,
                queries
            });
        }
    },

    /**
     * @returns {Promise<object>}
     */
    async run() {
        const members = await this.api.checkMilestones('members');
        let arr;
        const stripeLiveEnabled = getStripeLiveEnabled();

        if (stripeLiveEnabled) {
            arr = await this.api.checkMilestones('arr');
        }

        return {
            members,
            arr
        };
    },

    /**
     *
     * @param {number} [customTimeout]
     *
     *  @returns {Promise<object>}
     */
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
                const result = await this.run();
                return resolve(result);
            }, timeOut);
        });
    },

    /**
     * @param {number} [customTimeout]
     * Only used temporary for testing purposes.
     * Will be removed, after job scheduling implementation.
     *
     * @returns {Promise<object>}
     */
    async initAndRun(customTimeout) {
        await this.init();

        return this.scheduleRun(customTimeout);
    }
};
