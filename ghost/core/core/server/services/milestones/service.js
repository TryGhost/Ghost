const DomainEvents = require('@tryghost/domain-events');
const logging = require('@tryghost/logging');

const JOB_TIMEOUT = 1000 * 60 * 60 * 24 * (Math.floor(Math.random() * 3)); // 0 - 4 days;

const getStripeLiveEnabled = () => {
    const settingsCache = require('../../../shared/settings-cache');
    const stripeConnect = settingsCache.get('stripe_connect_publishable_key');
    const stripeKey = settingsCache.get('stripe_publishable_key');

    const stripeLiveRegex = /pk_live_/;

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

            const {
                MilestonesService,
                InMemoryMilestoneRepository
            } = require('@tryghost/milestones');
            const config = require('../../../shared/config');
            const milestonesConfig = config.get('milestones');

            const repository = new InMemoryMilestoneRepository({DomainEvents});
            const queries = new MilestoneQueries({db});

            this.api = new MilestonesService({
                repository,
                milestonesConfig, // avoid using getters and pass as JSON
                queries
            });
        }
    },

    /**
     * @returns {Promise<object>}
     */
    async run() {
        const labs = require('../../../shared/labs');

        if (labs.isSet('milestoneEmails')) {
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
        }
    },

    /**
     * @param {number} [customTimeout]
     *
     * @returns {Promise<object>}
     */
    async initAndRun(customTimeout) {
        /**
        * @param {number} ms
        * @returns {Promise<void>}
        */
        async function sleep(ms) {
            return new Promise((resolve) => {
                setTimeout(resolve, ms);
            });
        }

        const timeOut = customTimeout || JOB_TIMEOUT;

        const today = new Date();
        const msNow = today.getMilliseconds();
        const newMs = msNow + timeOut;
        const jobDate = today.setMilliseconds(newMs);

        await this.init();

        logging.info(`Running milestone emails job on ${new Date(jobDate).toString()}`);

        await sleep(timeOut);
        return await this.run();
    }
};
