const MailgunClient = require('@tryghost/mailgun-client');
const models = require('../../models');
const configService = require('../../../shared/config');
const settingsCache = require('../../../shared/settings-cache');
const MailgunEmailSuppressionList = require('./MailgunEmailSuppressionList');

const mailgunClient = new MailgunClient({
    config: configService,
    settings: settingsCache
});

module.exports = new MailgunEmailSuppressionList({
    Suppression: models.Suppression,
    apiClient: mailgunClient
});
