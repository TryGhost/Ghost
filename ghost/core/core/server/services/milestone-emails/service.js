// Stubbing stripe in test was causing issues. Moved it
// into this function to be able to rewire and stub the
// expected return value.
const getStripeLiveEnabled = () => {
    const stripeService = require('../stripe');
    // This seems to be the only true way to check if Stripe is configured in live mode
    // settingsCache only cares if Stripe is enabled
    return stripeService.api.configured && stripeService.api.mode === 'live';
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
     * @returns {Promise<void>}
     */
    async run() {
        const labs = require('../../../shared/labs');

        if (labs.isSet('milestoneEmails')) {
            await this.api.checkMilestones('members');
            const stripeLiveEnabled = getStripeLiveEnabled();

            if (stripeLiveEnabled) {
                await this.api.checkMilestones('arr');
            }
        }
    },

    /**
     * @returns {Promise<void>}
     */
    async initAndRun() {
        await this.init();
        await this.run();
    }
};
