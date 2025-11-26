const models = require('../../models');
const configService = require('../../../shared/config');
const settingsCache = require('../../../shared/settings-cache');
const labs = require('../../../shared/labs');
const MailgunEmailSuppressionList = require('./MailgunEmailSuppressionList');
const EmailService = require('../email-service/');

const mailClient = EmailService.getMailClient(settingsCache, configService, labs);

module.exports = new MailgunEmailSuppressionList({
    Suppression: models.Suppression,
    apiClient: mailClient
});
