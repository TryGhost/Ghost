const models = require('../../models');
const configService = require('../../../shared/config');
const settingsCache = require('../../../shared/settings-cache');
const labs = require('../../../shared/labs');
const MailgunClient = require('../lib/MailgunClient');
const MailgunEmailSuppressionList = require('./MailgunEmailSuppressionList');

const mailgunClient = new MailgunClient({
    config: configService,
    settings: settingsCache,
    labs
});

module.exports = new MailgunEmailSuppressionList({
    Suppression: models.Suppression,
    apiClient: mailgunClient
});
