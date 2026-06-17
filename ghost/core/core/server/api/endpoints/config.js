const publicConfig = require('../../services/public-config');
const config = require('../../../shared/config');
const logging = require('@tryghost/logging');
const errors = require('@tryghost/errors');
const sentry = require('../../../shared/sentry');

// Instrumentation for ONC-1774
//
// On Ghost(Pro) the bulk-email (Mailgun) config is written to disk before the
// container boots and is guaranteed correct, so `mailgunIsConfigured` should
// always be `true` here. Customers have nonetheless occasionally seen Admin
// behave as though Mailgun is not configured (the "Set up Mailgun to start
// sending newsletters!" publish-flow message), which a restart fixes.
//
// To work out whether the bad value originates server-side or purely in the
// browser, capture a Sentry error whenever we are about to serve a Pro site a
// config payload with `mailgunIsConfigured === false`. If this never fires we
// know the server is consistently correct and the race is client-side.
function reportUnexpectedMailgunConfig(configProperties) {
    const siteId = config.get('hostSettings:siteId');

    // hostSettings:siteId is only present on Ghost(Pro)
    if (!siteId || configProperties.mailgunIsConfigured) {
        return;
    }

    const bulkEmail = config.get('bulkEmail');

    logging.warn(`[ONC-1774] Serving Ghost(Pro) config with mailgunIsConfigured=false (siteId: ${siteId})`);

    // InternalServerError (statusCode 500) so it passes the sentry `beforeSend`
    // filter, which only forwards Ghost errors with a 500 status code.
    sentry.captureException(new errors.InternalServerError({
        message: 'Ghost(Pro) served config with mailgunIsConfigured=false',
        code: 'MAILGUN_CONFIG_UNEXPECTED'
    }), {
        level: 'error',
        tags: {
            feature: 'mailgun-config',
            ref: 'ONC-1774'
        },
        extra: {
            siteId,
            // Booleans only — never log credentials
            hasBulkEmail: !!bulkEmail,
            hasBulkEmailMailgun: !!(bulkEmail && bulkEmail.mailgun),
            managedEmailEnabled: !!config.get('hostSettings:managedEmail:enabled'),
            mailTransport: configProperties.mail
        }
    });
}

/** @type {import('@tryghost/api-framework').Controller} */
const controller = {
    docName: 'config',

    read: {
        headers: {
            cacheInvalidate: false
        },
        permissions: false,
        query() {
            const configProperties = publicConfig.config;

            reportUnexpectedMailgunConfig(configProperties);

            return configProperties;
        }
    }
};

module.exports = controller;
