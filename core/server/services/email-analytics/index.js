const config = require('../../../shared/config');
const logging = require('../../../shared/logging');
const db = require('../../data/db');
const settings = require('../settings/cache');
const EmailAnalyticsService = require('./email-analytics');

module.exports = new EmailAnalyticsService({
    config,
    logging,
    db,
    get settings() {
        return {
            mailgun_api_key: settings.get('mailgun_api_key'),
            mailgun_domain: settings.get('mailgun_domain'),
            mailgun_base_url: settings.get('mailgun_base_url')
        };
    }
});
