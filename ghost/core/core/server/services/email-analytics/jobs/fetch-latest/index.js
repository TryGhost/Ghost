const {run} = require('../fetch-latest-job');
const StartEmailAnalyticsJobEvent = require('../../events/start-email-analytics-job-event');

run({
    event: StartEmailAnalyticsJobEvent,
    logName: 'newsletters'
});
