const models = require('../../models');
const configService = require('../../../shared/config');
const settingsCache = require('../../../shared/settings-cache');
const MailgunClient = require('../lib/MailgunClient');
const MailgunEmailSuppressionList = require('./MailgunEmailSuppressionList');

const mailgunClient = new MailgunClient({
    config: configService,
    settings: settingsCache
});

module.exports = new MailgunEmailSuppressionList({
    Suppression: models.Suppression,
    apiClient: mailgunClient
});
