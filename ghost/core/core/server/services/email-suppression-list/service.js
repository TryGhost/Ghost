const configService = require('../../../shared/config');
const settingsCache = require('../../../shared/settings-cache');
const MailgunClient = require('../lib/MailgunClient');
const adapterManager = require('../adapter-manager');

const mailgunClient = new MailgunClient({
    config: configService,
    settings: settingsCache
});

module.exports = adapterManager.getAdapter('email-suppression', {
    apiClient: mailgunClient
});
