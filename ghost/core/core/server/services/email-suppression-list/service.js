const models = require('../../models');
const configService = require('../../../shared/config');
const settingsCache = require('../../../shared/settings-cache');
const EmailSuppressionList = require('./EmailSuppressionList');
const EmailService = require('../email-service/');

const mailClient = EmailService.getMailClient(settingsCache, configService);

module.exports = new EmailSuppressionList({
    Suppression: models.Suppression,
    apiClient: mailClient
});
