const path = require('path');
const urlUtils = require('../../../shared/url-utils');
const settingsCache = require('../../../shared/settings-cache');
const EmailContentGenerator = require('@tryghost/email-content-generator');

const emailContentGenerator = new EmailContentGenerator({
    getSiteUrl: () => urlUtils.urlFor('home', true),
    getSiteTitle: () => settingsCache.get('title'),
    templatesDir: path.resolve(__dirname, '..', 'mail', 'templates')
});

exports.GhostMailer = require('./GhostMailer');
exports.utils = {
    generateContent: emailContentGenerator.getContent.bind(emailContentGenerator)
};
