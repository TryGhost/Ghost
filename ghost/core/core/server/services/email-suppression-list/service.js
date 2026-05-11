const models = require('../../models');
const configService = require('../../../shared/config');
const settingsCache = require('../../../shared/settings-cache');
const MailgunClient = require('../lib/mailgun-client');
const ResendClient = require('../lib/resend-client');
const {resolveProvider} = require('../email-service/bulk-email-provider-factory');
const MailgunEmailSuppressionList = require('./mailgun-email-suppression-list');

const provider = resolveProvider(configService, settingsCache);
const apiClient = provider === 'resend'
    ? new ResendClient({config: configService, settings: settingsCache})
    : new MailgunClient({config: configService, settings: settingsCache});

module.exports = new MailgunEmailSuppressionList({
    Suppression: models.Suppression,
    apiClient
});
