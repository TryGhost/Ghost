const config = require('../../../shared/config');
const logging = require('../../../shared/logging');
const db = require('../../data/db');
const settings = require('../settings/cache');
const EmailAnalyticsService = require('./email-analytics');

module.exports = new EmailAnalyticsService({
    config,
    logging,
    db,
    settings
});
