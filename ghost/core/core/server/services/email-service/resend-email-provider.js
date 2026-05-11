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
                emailObj.replyTo = data.replyTo;
            }

            return emailObj;
        });
    }

    /**
     * @param {import('./sending-service').EmailData} data
     * @param {object} [options] - sending options. Accepted for interface
     *   parity with MailgunEmailProvider. Resend does not natively support
     *   open/click tracking toggles or scheduled deliveryTime at send time,
     *   so these are logged when requested and otherwise ignored.
     * @returns {Promise<{id: string}>}
     */
    async send(data, options = {}) {
        const recipientCount = data.recipients.length;
        const firstRecipient = data.recipients[0]?.email;
        logging.info(`[Resend] Sending email to ${recipientCount} recipients (first: ${firstRecipient}, from: ${data.from}, subject: "${data.subject}")`);
        if (options.deliveryTime) {
            logging.warn(`[Resend] options.deliveryTime requested (${options.deliveryTime}) but Resend has no scheduled-send API — sending immediately`);
        }
        if (options.clickTrackingEnabled || options.openTrackingEnabled) {
            logging.info(`[Resend] options.clickTracking=${!!options.clickTrackingEnabled} openTracking=${!!options.openTrackingEnabled} requested — Resend tracks via webhooks, configure in Resend dashboard`);
        }
        const startTime = Date.now();
        debug(`sending message to ${recipientCount} recipients`);

        if (!this.#resendClient.isConfigured()) {
            logging.warn('[Resend] Provider is not configured — set resend_api_key setting or bulkEmail.resend.apiKey config');
            return null;
        }

        try {
            const messageBase = {
                html: data.html,
                plaintext: data.plaintext
            };

            const emails = this.#buildRecipientEmails(data, messageBase);
            const resendInstance = this.#resendClient.getInstance();

            logging.info(`[Resend] Built ${emails.length} per-recipient email objects (replacements: ${data.replacementDefinitions?.length || 0})`);

            const BATCH_SIZE = 100;
            let lastId;
            let totalSent = 0;

            for (let i = 0; i < emails.length; i += BATCH_SIZE) {
                const batch = emails.slice(i, i + BATCH_SIZE);
                logging.info(`[Resend] Sending batch ${Math.floor(i / BATCH_SIZE) + 1} (${batch.length} emails)`);
                let response;
                if (batch.length === 1) {
                    response = await resendInstance.emails.send(batch[0]);
                    if (response?.error) {
                        logging.error(`[Resend] emails.send returned error: ${JSON.stringify(response.error)}`);
                        throw new errors.EmailError({
                            statusCode: response.error.statusCode,
                            message: response.error.message || 'Resend API error',
                            context: response.error.name,
                            code: 'RESEND_API_ERROR'
                        });
                    }
                    lastId = response?.data?.id;
                    logging.info(`[Resend] Single send accepted, id=${lastId}`);
                } else {
                    response = await resendInstance.batch.send(batch);
                    if (response?.error) {
                        logging.error(`[Resend] batch.send returned error: ${JSON.stringify(response.error)}`);
                        throw new errors.EmailError({
                            statusCode: response.error.statusCode,
                            message: response.error.message || 'Resend API error',
                            context: response.error.name,
                            code: 'RESEND_API_ERROR'
                        });
                    }
                    lastId = response?.data?.data?.[0]?.id || response?.data?.[0]?.id;
                    logging.info(`[Resend] Batch accepted, first id=${lastId}, count=${batch.length}`);
                }
                totalSent += batch.length;
            }

            debug(`sent message (${Date.now() - startTime}ms)`);
            logging.info(`[Resend] Sent ${totalSent} emails in ${Date.now() - startTime}ms`);

            return {id: lastId || 'resend-batch'};
        } catch (e) {
            debug(`failed to send message (${Date.now() - startTime}ms)`);
            logging.error(`[Resend] Send failed after ${Date.now() - startTime}ms: ${e.message}`);
            logging.error(e);

            if (this.#errorHandler) {
                this.#errorHandler(e);
            }

            throw new errors.EmailError({
                statusCode: e.statusCode,
                message: (e?.message || 'Resend Error').slice(0, 2000),
                errorDetails: JSON.stringify({message: e.message, name: e.name, statusCode: e.statusCode}),
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
