const {run} = require('../fetch-latest-job');
const {StartAutomationEmailAnalyticsJobEvent} = require('../../events/start-automation-email-analytics-job-event');

run({
    event: StartAutomationEmailAnalyticsJobEvent,
    logName: 'automations'
});
