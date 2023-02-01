const MilestoneEmailService = require('./MilestoneEmailService');
const {
    InMemoryMilestoneRepository,
    MilestonesAPI
} = require('@tryghost/milestone-emails');
const config = require('../../../shared/config');
// const {GhostMailer} = require('../mail');
const jobsService = require('../jobs');

// What do we need?
// JobService
// users model to get preferences (we shouldn't send any emails if admin or user has opt-out)
// API or mocked API to read which milestone next
// GhostMailer
// MilestoneEmailController
// Config
// Queries

// What do we need to do?
// Either on events or periodically, we need to run queries using the JobService
// Which queries we run is either defined by a MilestoneEmail model, or as part of the config in defaults.json
// When the query matches and we hit a milestone, we send out the required email using GhostMailer
// We need to update the state of the check into a table, MilestoneEmail, saving only when the query was successful and an email was sent

module.exports = {
    service: new MilestoneEmailService(),
    async init() {
        const repository = new InMemoryMilestoneRepository();
        const api = new MilestonesAPI({
            repository
        });

        this.service.init({
            api,
            config,
            jobsService
        });
    }
};
