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
            const stripeService = require('../stripe');
            // This seems to be the only true way to check if Stripe is configured in live mode
            // settingsCache only cares if Stripe is enabled
            const isStripeLiveEnabled = stripeService.api.configured && stripeService.api.mode === 'live';

            const {
                MilestonesEmailService,
                InMemoryMilestoneRepository
            } = require('@tryghost/milestone-emails');
            const config = require('../../../shared/config');
            const milestonesConfig = config.get('milestones');
            const {GhostMailer} = require('../mail');

            const mailer = new GhostMailer();
            const repository = new InMemoryMilestoneRepository();
            const queries = new MilestoneQueries({db, milestonesConfig});

            const milestonesEmailService = new MilestonesEmailService({
                mailer,
                repository,
                milestonesConfig, // avoid using getters and pass as JSON
                queries
            });

            let arrResult;

            // @TODO: schedule recurring jobs instead
            const membersResult = await milestonesEmailService.checkMilestones('members');

            if (isStripeLiveEnabled) {
                arrResult = await milestonesEmailService.checkMilestones('arr');
            }

            return {
                members: membersResult,
                arr: arrResult
            };
        }
    }
};

// /**
//  *
//  * @returns {Promise<boolean>}
//  */
// module.exports.scheduleRecurringJobs = async () => {
//     if (!hasScheduled) {
//         const jobsService = require('../jobs');
//         const path = require('path');

//         const s = Math.floor(Math.random() * 60); // 0-59 second
//         const m = Math.floor(Math.random() * 60); // 0-59 minute
//         const h = Math.floor(Math.random() * 24); // 0-23 hour
//         const wd = Math.floor(Math.random() * 7); // 0-6 weekday

//         jobsService.addJob({
//             at: `${s} ${m} ${h} * * ${wd}`, // Every week
//             // at: '55 * * * * *', // every minute for local development
//             job: path.resolve(__dirname, 'jobs/run-arr-milestones.js'),
//             name: 'milestone-emails-arr'
//         });

//         jobsService.addJob({
//             at: `${s} ${m} ${h} * * ${wd}`, // Every week
//             // at: '56 * * * * *', // every minute for local development
//             job: path.resolve(__dirname, 'jobs/run-members-milestones.js'),
//             name: 'milestone-emails-members'
//         });

//         hasScheduled = true;
//     }
//     return hasScheduled;
// };
