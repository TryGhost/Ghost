const models = require('../../models');
const configService = require('../../../shared/config');
const settingsCache = require('../../../shared/settings-cache');
const MailgunClient = require('../lib/mailgun-client');
const ResendClient = require('../lib/resend-client');
const {resolveProvider} = require('../email-service/bulk-email-provider-factory');
const MailgunEmailSuppressionList = require('./mailgun-email-suppression-list');

// Both clients are cheap to construct (they only store references), so build
// both eagerly and dispatch on each call. This avoids picking the wrong
// provider at module-require time when the settings cache may not yet be
// populated.
const mailgunClient = new MailgunClient({config: configService, settings: settingsCache});
const resendClient = new ResendClient({config: configService, settings: settingsCache});

function activeClient() {
    return resolveProvider(configService, settingsCache) === 'resend' ? resendClient : mailgunClient;
}

const apiClient = {
    removeBounce: email => activeClient().removeBounce(email),
    removeComplaint: email => activeClient().removeComplaint(email),
    removeUnsubscribe: email => activeClient().removeUnsubscribe(email)
};

module.exports = new MailgunEmailSuppressionList({
    Suppression: models.Suppression,
    apiClient
});
