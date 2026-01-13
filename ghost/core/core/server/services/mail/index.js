const path = require('path');
const urlUtils = require('../../../shared/url-utils');
const settingsCache = require('../../../shared/settings-cache');
const EmailContentGenerator = require('../lib/email-content-generator');

const emailContentGenerator = new EmailContentGenerator({
    getSiteUrl: () => urlUtils.urlFor('home', true),
    getSiteTitle: () => settingsCache.get('title'),
    templatesDir: path.resolve(__dirname, '..', 'mail', 'templates')
});

exports.GhostMailer = require('./ghost-mailer');
exports.utils = {
    generateContent: emailContentGenerator.getContent.bind(emailContentGenerator)
};
