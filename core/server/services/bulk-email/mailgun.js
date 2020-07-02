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
    const bulkEmailSetting = {
        apiKey: settingsCache.get('mailgun_api_key'),
        domain: settingsCache.get('mailgun_domain'),
        baseUrl: settingsCache.get('mailgun_base_url')
    };
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
