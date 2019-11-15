const {URL} = require('url');
const mailgun = require('mailgun-js');
const common = require('../../lib/common');
const configService = require('../../config');
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
        common.logging.warn(`Bulk email service is not configured`);
    } else {
        try {
            let mailgunConfig = hasMailgunConfig ? bulkEmailConfig.mailgun : bulkEmailSetting;
            return createMailgun(mailgunConfig);
        } catch (err) {
            common.logging.warn(`Bulk email service is not configured`);
        }
    }
    return null;
}

module.exports = {
    getInstance: getInstance
};
