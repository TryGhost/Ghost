const models = require('../../models');
const configService = require('../../../shared/config');
const settingsCache = require('../../../shared/settings-cache');
const ResendClient = require('../lib/resend-client');
const MailgunEmailSuppressionList = require('./mailgun-email-suppression-list');

const resendClient = new ResendClient({
    config: configService,
    settings: settingsCache
});

module.exports = new MailgunEmailSuppressionList({
    Suppression: models.Suppression,
    apiClient: resendClient
});
