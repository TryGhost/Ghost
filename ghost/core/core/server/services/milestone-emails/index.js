const labs = require('../../../shared/labs');

class MilestoneEmailsWrapper {
    async initAndSchedule() {
        if (labs.isSet('milestoneEmails')) {
            const jobsService = require('../jobs');
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
            const queries = new MilestoneQueries({db, milestonesConfig});

            const milestonesEmailService = new MilestonesEmailService({
                mailer,
                repository,
                milestonesConfig, // avoid using getters and pass as JSON
                queries
                // TODO: do we need to check if Stripe is live enabled?
            });

            const s = Math.floor(Math.random() * 60); // 0-59 second
            const m = Math.floor(Math.random() * 60); // 0-59 minute
            const h = Math.floor(Math.random() * 24); // 0-23 hour
            const wd = Math.floor(Math.random() * 7); // 0-6 weekday

            jobsService.addJob({
                at: `${s} ${m} ${h} * * ${wd}`, // Every week
                job: async () => await milestonesEmailService.checkMilestones('arr'),
                name: 'milestone-emails-arr',
                // TODO: I don't think we can use offloading when we need to schedule the jobs with CRON
                offloaded: false
            });

            jobsService.addJob({
                at: `${s} ${m} ${h} * * ${wd}`, // Every week
                job: async () => await milestonesEmailService.checkMilestones('members'),
                name: 'milestone-emails-members',
                // TODO: I don't think we can use offloading when we need to schedule the jobs with CRON
                offloaded: false
            });
        }
    }
}

module.exports = new MilestoneEmailsWrapper();
