const labs = require('../../../shared/labs');
// const settingsCache = require('../../../shared/settings-cache');

class MilestoneEmailsWrapper {
    async initAndSchedule() {
        if (labs.isSet('milestoneEmails')) {
            const jobsService = require('../jobs');
            const db = require('../../data/db');
            const MilestoneQueries = require('./MilestoneQueries');

            const {
                MilestonesEmailService,
                MilestonesAPI,
                InMemoryMilestoneRepository
            } = require('@tryghost/milestone-emails');
            const config = require('../../../shared/config');
            const {GhostMailer} = require('../mail');

            const mailer = new GhostMailer();

            const repository = new InMemoryMilestoneRepository();
            const api = new MilestonesAPI({
                repository
            });

            const queries = new MilestoneQueries({db});

            const milestonesEmailService = new MilestonesEmailService({
                mailer,
                api,
                config,
                queries,
                // TODO: do we need to check if Stripe is live enabled?
                // TODO: evaluate the default currency of the products enabled
                defaultCurrency: 'usd'
            });

            const s = Math.floor(Math.random() * 60); // 0-59 second
            const m = Math.floor(Math.random() * 60); // 0-59 minute
            const h = Math.floor(Math.random() * 24); // 0-23 hour
            const wd = Math.floor(Math.random() * 7); // 0-6 weekday

            jobsService.addJob({
                at: `${s} ${m} ${h} * * ${wd}`, // Every week
                job: async () => await milestonesEmailService.runARRQueries(),
                name: 'milestone-emails-arr',
                offloaded: false
            });

            jobsService.addJob({
                at: `${s} ${m} ${h} * * ${wd}`, // Every week
                job: async () => await milestonesEmailService.runMemberQueries(),
                name: 'milestone-emails-members',
                offloaded: false
            });
        }
    }
}

module.exports = new MilestoneEmailsWrapper();
