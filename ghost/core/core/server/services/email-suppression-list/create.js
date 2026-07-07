const MailgunClient = require('../lib/mailgun-client');
const MailgunEmailSuppressionList = require('./mailgun-email-suppression-list');

/**
 * @param {object} deps
 * @param {object} deps.models
 * @param {object} deps.settingsCache
 * @param {{get: (key: string) => unknown}} deps.configView
 * @param {object} deps.labs
 */
module.exports = function createEmailSuppressionList({models, settingsCache, configView, labs}) {
    const mailgunClient = new MailgunClient({
        config: configView,
        settings: settingsCache,
        labs
    });

    return new MailgunEmailSuppressionList({
        Suppression: models.Suppression,
        apiClient: mailgunClient
    });
};
