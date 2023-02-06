const labs = require('../../../shared/labs');

class MilestoneEmailsWrapper {
    async initAndSchedule() {
        if (labs.isSet('milestoneEmails')) {
            const jobsService = require('../jobs');
            const {
                MilestoneEmailsService,
                MilestonesAPI,
                queries,
                MileStonesInMemoryRepository
            } = require('@tryghost/milestone-emails');
            const config = require('../../../shared/config');
            const {GhostMailer} = require('../mail');
            const mailer = new GhostMailer();

            const api = new MilestonesAPI({
                repository: new MileStonesInMemoryRepository()
            });

            const milestonesEmailService = new MilestoneEmailsService({
                sendMail: mailer,
                api,
                config,
                queries
            });

            const s = Math.floor(Math.random() * 60); // 0-59 second
            const m = Math.floor(Math.random() * 60); // 0-59 minute
            const h = Math.floor(Math.random() * 24); // 0-23 hour
            const wd = Math.floor(Math.random() * 7); // 0-6 weekday

            jobsService.addJob({
                at: `${s} ${m} ${h} * * ${wd}`, // Every week
                job: milestonesEmailService.runQueries(),
                name: 'milestone-emails'
            });
        }
    }
}

module.exports = new MilestoneEmailsWrapper();
