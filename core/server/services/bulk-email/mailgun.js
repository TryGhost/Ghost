const _ = require('lodash');
const {URL} = require('url');
const mailgun = require('mailgun-js');
const logging = require('../../../shared/logging');
const configService = require('../../../shared/config');
const settingsCache = require('../settings/cache');

const BATCH_SIZE = 1000;

function createMailgun(config) {
    const baseUrl = new URL(config.baseUrl);

    return mailgun({
        apiKey: config.apiKey,
        domain: config.domain,
        protocol: baseUrl.protocol,
        host: baseUrl.hostname,
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
        let mailgunConfig = hasMailgunConfig ? bulkEmailConfig.mailgun : bulkEmailSetting;
        return createMailgun(mailgunConfig);
    }
    return null;
}

// recipients format:
// {
//     'test@example.com': {
//         name: 'Test User',
//         unique_id: '12345abcde',
//         unsubscribe_url: 'https://example.com/unsub/me'
//     }
// }
function send(message, recipientData, replacements) {
    if (recipientData.length > BATCH_SIZE) {
        // err - too many recipients
    }

    let messageData = {};

    try {
        const bulkEmailConfig = configService.get('bulkEmail');
        const mailgunInstance = getInstance();

        const messageContent = _.pick(message, 'subject', 'html', 'plaintext');

        // update content to use Mailgun variable syntax for replacements
        replacements.forEach((replacement) => {
            messageContent[replacement.format] = messageContent[replacement.format].replace(
                replacement.match,
                `%recipient.${replacement.id}%`
            );
        });

        messageData = {
            to: Object.keys(recipientData),
            from: message.from,
            'h:Reply-To': message.replyTo,
            'recipient-variables': recipientData,
            subject: messageContent.subject,
            html: messageContent.html,
            text: messageContent.plaintext
        };

        if (bulkEmailConfig && bulkEmailConfig.mailgun && bulkEmailConfig.mailgun.tag) {
            messageData['o:tag'] = [bulkEmailConfig.mailgun.tag, 'bulk-email'];
        }

        if (bulkEmailConfig && bulkEmailConfig.mailgun && bulkEmailConfig.mailgun.testmode) {
            messageData['o:testmode'] = true;
        }

        return new Promise((resolve, reject) => {
            mailgunInstance.messages().send(messageData, (error, body) => {
                if (error) {
                    return reject(error);
                }

                return resolve({
                    id: body.id
                });
            });
        });
    } catch (error) {
        return Promise.reject({error, messageData});
    }
}

module.exports = {
    BATCH_SIZE,
    getInstance,
    send
};
