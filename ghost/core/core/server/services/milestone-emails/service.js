// Stubbing stripe in test was causing issues. Moved it
// into this function to be able to rewire and stub the
// expected return value.
const getStripeLiveEnabled = () => {
    const stripeService = require('../stripe');
    // This seems to be the only true way to check if Stripe is configured in live mode
    // settingsCache only cares if Stripe is enabled
    return stripeService.api.configured && stripeService.api.mode === 'live';
};

/**
 *
 * @returns {Promise<any>}
 */
module.exports = {
    async initAndRun() {
        const labs = require('../../../shared/labs');

        if (labs.isSet('milestoneEmails')) {
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

            const milestonesEmailService = new MilestonesEmailService({
                mailer,
                repository,
                milestonesConfig, // avoid using getters and pass as JSON
                queries
            });

            let arrResult;

            // @TODO: schedule recurring jobs instead
            const membersResult = await milestonesEmailService.checkMilestones('members');
            const stripeLiveEnabled = getStripeLiveEnabled();

            if (stripeLiveEnabled) {
                arrResult = await milestonesEmailService.checkMilestones('arr');
            }

            return {
                members: membersResult,
                arr: arrResult
            };
        }
    }
};
