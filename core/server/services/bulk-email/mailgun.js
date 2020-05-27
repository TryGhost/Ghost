const {URL} = require('url');
const mailgun = require('mailgun-js');
const logging = require('../../../shared/logging');
const configService = require('../../../shared/config');
const settingsCache = require('../settings/cache');

function createMailgun(config) {
    const baseUrl = new URL(config.baseUrl);

    return mailgun({
        apiKey: config.apiKey,
        domain: config.domain,
        protocol: baseUrl.protocol,
        host: baseUrl.host,
        port: baseUrl.port,
        endpoint: baseUrl.pathname,
        retry: 5
    });
}

function getInstance() {
    const bulkEmailConfig = configService.get('bulkEmail');
    const bulkEmailSetting = settingsCache.get('bulk_email_settings');
    const hasMailgunConfig = !!(bulkEmailConfig && bulkEmailConfig.mailgun);
    const hasMailgunSetting = !!(bulkEmailSetting && bulkEmailSetting.apiKey && bulkEmailSetting.baseUrl && bulkEmailSetting.domain);
    if (!hasMailgunConfig && !hasMailgunSetting) {
        logging.warn(`Bulk email service is not configured`);
    } else {
        try {
            let mailgunConfig = hasMailgunConfig ? bulkEmailConfig.mailgun : bulkEmailSetting;
            return createMailgun(mailgunConfig);
        } catch (err) {
            logging.warn(`Bulk email service is not configured`);
        }
    }
    return null;
}

module.exports = {
    getInstance: getInstance
};
