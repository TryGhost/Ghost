const config = require('../../../shared/config');
const settings = require('../settings/cache');
const logging = require('../../../shared/logging');
const db = require('../../data/db');
const EmailAnalyticsService = require('./email-analytics');

module.exports = new EmailAnalyticsService({
    config,
    settings,
    logging,
    db
});
