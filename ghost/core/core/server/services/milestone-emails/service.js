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
    /** @type {import('@tryghost/milestone-emails/lib/MilestonesEmailService')} */
    api: null,

    /**
     * @returns {Promise<void>}
     */
    async init() {
        if (!this.api) {
            const db = require('../../data/db');
            const MilestoneQueries = require('./MilestoneQueries');

            const {
                MilestonesEmailService,
                InMemoryMilestoneRepository
            } = require('@tryghost/milestone-emails');
            const config = require('../../../shared/config');
            const milestonesConfig = config.get('milestones');
            const {GhostMailer} = require('../mail');

            const mailer = new GhostMailer();
            const repository = new InMemoryMilestoneRepository();
            const queries = new MilestoneQueries({db});

            this.api = new MilestonesEmailService({
                mailer,
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
     * @returns {Promise<object>}
     */
    async initAndRun() {
        await this.init();
        return await this.run();
    }
};
