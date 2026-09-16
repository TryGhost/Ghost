const { run } = require('../fetch-latest-job');
const {
  StartGiftEmailAnalyticsJobEvent,
} = require('../../events/start-gift-email-analytics-job-event');

run({
  event: StartGiftEmailAnalyticsJobEvent,
});
