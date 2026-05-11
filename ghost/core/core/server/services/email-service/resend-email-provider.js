const logging = require('@tryghost/logging');
const errors = require('@tryghost/errors');
const debug = require('@tryghost/debug')('email-service:resend-provider-service');

class ResendEmailProvider {
    #resendClient;
    #errorHandler;

    /**
     * @param {object} dependencies
     * @param {import('../lib/resend-client')} dependencies.resendClient
     * @param {Function} [dependencies.errorHandler]
     */
    constructor({resendClient, errorHandler}) {
        this.#resendClient = resendClient;
        this.#errorHandler = errorHandler;
    }

    /**
     * Build per-recipient email objects with variable substitution applied.
     * Resend has no server-side template engine, so substitution happens here.
     */
    #buildRecipientEmails(data, messageBase) {
        const {recipients, replacementDefinitions} = data;

        return recipients.map((recipient) => {
            const valueMap = {};
            for (const r of recipient.replacements) {
                valueMap[r.id] = r.value;
            }

            let html = messageBase.html;
            let text = messageBase.plaintext;

            for (const def of replacementDefinitions) {
                const value = valueMap[def.id] !== undefined ? String(valueMap[def.id]) : '';
                if (html) {
                    html = html.replace(def.token, value);
                }
                if (text) {
                    text = text.replace(def.token, value);
                }
            }

            const headers = {
                'Auto-Submitted': 'auto-generated',
                'X-Auto-Response-Suppress': 'OOF, AutoReply'
            };

            if (data.emailId) {
                headers['X-Ghost-Email-Id'] = data.emailId;
            }

            if (valueMap.list_unsubscribe) {
                headers['List-Unsubscribe'] = `<${valueMap.list_unsubscribe}>`;
                headers['List-Unsubscribe-Post'] = 'List-Unsubscribe=One-Click';
            }

            const emailObj = {
                from: data.from,
                to: [recipient.email],
                subject: data.subject,
                html: html || undefined,
                text: text || undefined,
                headers
            };

            if (data.replyTo) {
                emailObj.reply_to = data.replyTo;
            }

            return emailObj;
        });
    }

    /**
     * @param {import('./sending-service').EmailData} data
     * @param {object} options
     * @param {boolean} options.openTrackingEnabled
     * @param {boolean} options.clickTrackingEnabled
     * @returns {Promise<{id: string}>}
     */
    async send(data) {
        logging.info(`Sending email to ${data.recipients.length} recipients via Resend`);
        const startTime = Date.now();
        debug(`sending message to ${data.recipients.length} recipients`);

        if (!this.#resendClient.isConfigured()) {
            logging.warn('Resend is not configured');
            return null;
        }

        try {
            const messageBase = {
                html: data.html,
                plaintext: data.plaintext
            };

            const emails = this.#buildRecipientEmails(data, messageBase);
            const resendInstance = this.#resendClient.getInstance();

            const BATCH_SIZE = 100;
            let lastId;

            for (let i = 0; i < emails.length; i += BATCH_SIZE) {
                const batch = emails.slice(i, i + BATCH_SIZE);
                let response;
                if (batch.length === 1) {
                    response = await resendInstance.emails.send(batch[0]);
                    lastId = response?.data?.id;
                } else {
                    response = await resendInstance.batch.send(batch);
                    lastId = response?.data?.[0]?.id;
                }
            }

            debug(`sent message (${Date.now() - startTime}ms)`);
            logging.info(`Sent message via Resend (${Date.now() - startTime}ms)`);

            return {id: lastId || 'resend-batch'};
        } catch (e) {
            debug(`failed to send message (${Date.now() - startTime}ms)`);

            if (this.#errorHandler) {
                this.#errorHandler(e);
            }

            throw new errors.EmailError({
                statusCode: e.statusCode,
                message: (e?.message || 'Resend Error').slice(0, 2000),
                errorDetails: JSON.stringify(e),
                context: `Resend Error ${e.statusCode}: ${e.message}`,
                help: 'https://ghost.org/docs/newsletters/#bulk-email-configuration',
                code: 'BULK_EMAIL_SEND_FAILED'
            });
        }
    }

    getMaximumRecipients() {
        return this.#resendClient.getBatchSize();
    }

    getTargetDeliveryWindow() {
        return this.#resendClient.getTargetDeliveryWindow();
    }
}

module.exports = ResendEmailProvider;
