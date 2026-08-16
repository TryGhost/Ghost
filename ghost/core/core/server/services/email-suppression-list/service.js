const models = require('../../models');
const configService = require('../../../shared/config');
const settingsCache = require('../../../shared/settings-cache');
const MailgunClient = require('../lib/mailgun-client');
const MailgunEmailSuppressionList = require('./mailgun-email-suppression-list');

const mailgunClient = new MailgunClient({
    config: configService,
    settings: settingsCache
});

module.exports = new MailgunEmailSuppressionList({
    Suppression: models.Suppression,
    apiClient: mailgunClient
});
