const _ = require('lodash');
const debug = require('@tryghost/debug');
const logging = require('@tryghost/logging');
const metrics = require('@tryghost/metrics');
const errors = require('@tryghost/errors');

module.exports = class MailgunClient {
    #config;
    #settings;

    static DEFAULT_BATCH_SIZE = 1000;

    constructor({config, settings}) {
        this.#config = config;
        this.#settings = settings;
    }

    /**
     * Creates the data payload and sends to Mailgun
     *
     * @param {Object} message
     * @param {Object} recipientData
     * @param {Array<Object>} replacements
     *
     * recipientData format:
     * {
     *     'test@example.com': {
     *         name: 'Test User',
     *         unsubscribe_url: 'https://example.com/unsub/me',
     *         list_unsubscribe: 'https://example.com/unsub/me'
     *     }
     * }
     */
    async send(message, recipientData, replacements) {
        const mailgunInstance = this.getInstance();
        if (!mailgunInstance) {
            logging.warn(`Mailgun is not configured`);
            return null;
        }

        const batchSize = this.getBatchSize();
        if (Object.keys(recipientData).length > batchSize) {
            throw new errors.IncorrectUsageError({
                message: `Mailgun only supports sending to ${batchSize} recipients at a time`
            });
        }

        let messageData = {};

        let startTime;
        try {
            const bulkEmailConfig = this.#config.get('bulkEmail');
            const messageContent = _.pick(message, 'subject', 'html', 'plaintext');

            // update content to use Mailgun variable syntax for replacements
            replacements.forEach((replacement) => {
                messageContent[replacement.format] = messageContent[replacement.format].replace(
                    replacement.regexp,
                    `%recipient.${replacement.id}%`
                );
            });

            messageData = {
                to: Object.keys(recipientData),
                from: message.from,
                'h:Reply-To': message.replyTo || message.reply_to,
                subject: messageContent.subject,
                html: messageContent.html,
                text: messageContent.plaintext,
                'recipient-variables': JSON.stringify(recipientData),
                'h:Sender': message.from,
                'h:Auto-Submitted': 'auto-generated',
                'h:X-Auto-Response-Suppress': 'OOF, AutoReply'
            };

            // Do we have a custom List-Unsubscribe header set?
            // (we need a variable for this, as this is a per-email setting)
            if (Object.keys(recipientData)[0] && recipientData[Object.keys(recipientData)[0]].list_unsubscribe) {
                messageData['h:List-Unsubscribe'] = '<%recipient.list_unsubscribe%>, <%tag_unsubscribe_email%>';
                messageData['h:List-Unsubscribe-Post'] = 'List-Unsubscribe=One-Click';
            }

            // add a reference to the original email record for easier mapping of mailgun event -> email
            if (message.id) {
                messageData['v:email-id'] = message.id;
            }

            const tags = ['bulk-email', 'ghost-email'];
            if (bulkEmailConfig?.mailgun?.tag) {
                tags.push(bulkEmailConfig.mailgun.tag);
            }
            messageData['o:tag'] = tags;

            if (bulkEmailConfig?.mailgun?.testmode) {
                messageData['o:testmode'] = true;
            }

            // enable tracking if turned on for this email
            if (message.track_opens) {
                messageData['o:tracking-opens'] = true;
            }

            // set the delivery time if specified
            if (message.deliveryTime && message.deliveryTime instanceof Date) {
                messageData['o:deliverytime'] = message.deliveryTime.toUTCString();
            }

            const mailgunConfig = this.#getConfig();
            startTime = Date.now();

            // Use overriden domain if specified in message
            const mailDomain = message.domainOverride ? message.domainOverride : mailgunConfig.domain;

            const response = await mailgunInstance.messages.create(mailDomain, messageData);
            metrics.metric('mailgun-send-mail', {
                value: Date.now() - startTime,
                statusCode: 200
            });

            return {
                id: response.id
            };
        } catch (error) {
            logging.error(error);
            metrics.metric('mailgun-send-mail', {
                value: Date.now() - startTime,
                statusCode: error.status
            });
            return Promise.reject({error, messageData});
        }
    }

    /**
     * @param {import('mailgun.js').Interfaces.IMailgunClient} mailgunInstance
     * @param {string} domain - The Mailgun domain to fetch events from
     * @param {Object} mailgunOptions
     */
    async getEventsFromMailgun(mailgunInstance, domain, mailgunOptions) {
        const startTime = Date.now();
        try {
            const page = await mailgunInstance.events.get(domain, mailgunOptions);
            metrics.metric('mailgun-get-events', {
                value: Date.now() - startTime,
                statusCode: 200
            });
            return page;
        } catch (error) {
            metrics.metric('mailgun-get-events', {
                value: Date.now() - startTime,
                statusCode: error.status
            });
            throw error;
        }
    }

    /**
     * Fetches events from Mailgun
     * @param {Object} mailgunOptions
     * @param {Function} batchHandler
     * @param {Object} options
     * @param {number} [options.maxEvents] Not a strict maximum. We stop fetching after we reached the maximum AND received at least one event after begin (not equal) to prevent deadlocks.
     * @returns {Promise<void>}
     */
    async fetchEvents(mailgunOptions, batchHandler, {maxEvents = Infinity} = {}) {
        const mailgunInstance = this.getInstance();
        if (!mailgunInstance) {
            logging.warn(`Mailgun is not configured`);
            return;
        }

        const mailgunConfig = this.#getConfig();
        if (!mailgunConfig) {
            logging.warn(`Mailgun is not configured`);
            return;
        }

        // Determine which domains to fetch from
        const domains = this.#getDomainsToFetch(mailgunConfig);

        // Fetch events from each domain
        for (const domain of domains) {
            await this.#fetchEventsFromDomain(domain, mailgunInstance, mailgunOptions, batchHandler, {maxEvents});
        }
    }

    /**
     * Get list of domains to fetch events from
     * Returns primary domain, and fallback domain if domain warming is enabled
     * @param {Object} mailgunConfig
     * @returns {string[]}
     */
    #getDomainsToFetch(mailgunConfig) {
        const domains = [mailgunConfig.domain];

        const fallbackDomain = this.#config.get('hostSettings:managedEmail:fallbackDomain');
        if (fallbackDomain && fallbackDomain !== mailgunConfig.domain) {
            domains.push(fallbackDomain);
            logging.info(`[MailgunClient] Domain warming enabled, fetching from both primary (${mailgunConfig.domain}) and fallback (${fallbackDomain}) domains`);
        }

        return domains;
    }

    /**
     * Fetches events from a specific Mailgun domain
     * @param {string} domain - The domain to fetch from
     * @param {import('mailgun.js').Interfaces.IMailgunClient} mailgunInstance
     * @param {Object} mailgunOptions
     * @param {Function} batchHandler
     * @param {Object} options
     * @param {Number} options.maxEvents
     * @returns {Promise<void>}
     */
    async #fetchEventsFromDomain(domain, mailgunInstance, mailgunOptions, batchHandler, {maxEvents}) {
        debug(`[MailgunClient fetchEventsFromDomain]: starting fetching from domain ${domain}`);
        const startDate = new Date();
        const overallStartTime = Date.now();

        let batchCount = 0;
        let totalBatchTime = 0;

        try {
            let page = await this.getEventsFromMailgun(mailgunInstance, domain, mailgunOptions);

            // By limiting the processed events to ones created before this job started we cancel early ready for the next job run.
            // Avoids chance of events being missed in long job runs due to mailgun's eventual-consistency creating events outside of our 30min sliding re-check window
            let events = (page?.items?.map(this.normalizeEvent) || []).filter(e => !!e && e.timestamp <= startDate);
            debug(`[MailgunClient fetchEventsFromDomain ${domain}]: finished fetching first page with ${events.length} events`);

            let eventCount = 0;
            const beginTimestamp = mailgunOptions.begin ? Math.ceil(mailgunOptions.begin * 1000) : undefined; // ceil here if we have rounding errors

            while (events.length !== 0) {
                const batchStartTime = Date.now();
                await batchHandler(events);
                const batchEndTime = Date.now();
                const batchDuration = batchEndTime - batchStartTime;

                batchCount += 1;
                totalBatchTime += batchDuration;

                eventCount += events.length;

                if (eventCount >= maxEvents && (!beginTimestamp || !events[events.length - 1].timestamp || (events[events.length - 1].timestamp.getTime() > beginTimestamp))) {
                    break;
                }

                const nextPageId = page.pages.next.page;
                debug(`[MailgunClient fetchEventsFromDomain ${domain}]: starting fetching next page ${nextPageId}`);
                page = await this.getEventsFromMailgun(mailgunInstance, domain, {
                    page: nextPageId,
                    ...mailgunOptions
                });

                // We need to cap events at the time we started fetching them (see comment above)
                events = (page?.items?.map(this.normalizeEvent) || []).filter(e => !!e && e.timestamp <= startDate);
                debug(`[MailgunClient fetchEventsFromDomain ${domain}]: finished fetching next page with ${events.length} events`);
            }

            const overallEndTime = Date.now();
            const totalDuration = overallEndTime - overallStartTime;
            const averageBatchTime = batchCount > 0 ? totalBatchTime / batchCount : 0;

            logging.info(`[MailgunClient fetchEventsFromDomain ${domain}]: Processed ${batchCount} batches in ${(totalDuration / 1000).toFixed(2)}s. Average batch time: ${(averageBatchTime / 1000).toFixed(2)}s`);
        } catch (error) {
            logging.error(`[MailgunClient fetchEventsFromDomain ${domain}]: Error fetching events`);
            logging.error(error);
            throw error;
        }
    }

    async removeSuppression(type, email) {
        if (!this.isConfigured()) {
            return false;
        }
        const instance = this.getInstance();
        const config = this.#getConfig();

        try {
            await instance.suppressions.destroy(
                config.domain,
                type,
                email
            );
            return true;
        } catch (err) {
            logging.error(err);
            return false;
        }
    }

    async removeBounce(email) {
        return this.removeSuppression('bounces', email);
    }

    async removeComplaint(email) {
        return this.removeSuppression('complaints', email);
    }

    async removeUnsubscribe(email) {
        return this.removeSuppression('unsubscribes', email);
    }

    normalizeEvent(event) {
        const providerId = event?.message?.headers['message-id'];

        if (!providerId && !(event['user-variables'] && event['user-variables']['email-id'])) {
            logging.error('Received invalid event from Mailgun');
            logging.error(event);
            return null;
        }

        return {
            id: event.id,
            type: event.event,
            severity: event.severity,
            recipientEmail: event.recipient,
            emailId: event['user-variables'] && event['user-variables']['email-id'],
            providerId: providerId,
            timestamp: new Date(event.timestamp * 1000),

            error: event['delivery-status'] && (typeof (event['delivery-status'].message || event['delivery-status'].description) === 'string') ? {
                code: event['delivery-status'].code,
                message: (event['delivery-status'].message || event['delivery-status'].description).substring(0, 2000),
                enhancedCode: event['delivery-status']['enhanced-code']?.toString()?.substring(0, 50) ?? null
            } : null
        };
    }

    #getConfig() {
        const bulkEmailConfig = this.#config.get('bulkEmail');
        const bulkEmailSetting = {
            apiKey: this.#settings.get('mailgun_api_key'),
            domain: this.#settings.get('mailgun_domain'),
            baseUrl: this.#settings.get('mailgun_base_url')
        };

        const hasMailgunConfig = !!(bulkEmailConfig?.mailgun);
        const hasMailgunSetting = !!(bulkEmailSetting && bulkEmailSetting.apiKey && bulkEmailSetting.baseUrl && bulkEmailSetting.domain);

        if (!hasMailgunConfig && !hasMailgunSetting) {
            return null;
        }

        const mailgunConfig = hasMailgunConfig ? bulkEmailConfig.mailgun : bulkEmailSetting;
        return mailgunConfig;
    }

    /**
     * Returns an instance of the Mailgun client based upon the config or settings values
     *
     * We don't cache the instance so we can always get a fresh one based upon changed settings
     * or config values over time
     *
     * Note: if the credentials are not configure, this method returns `null` and it is down to the
     * consumer to act upon this/log this out
     *
     * @returns {import('mailgun.js').Interfaces.IMailgunClient|null} the Mailgun client instance
     */
    getInstance() {
        const mailgunConfig = this.#getConfig();
        if (!mailgunConfig) {
            return null;
        }

        const formData = require('form-data');
        const Mailgun = require('mailgun.js').default;

        const baseUrl = new URL(mailgunConfig.baseUrl);
        const mailgun = new Mailgun(formData);

        return mailgun.client({
            username: 'api',
            key: mailgunConfig.apiKey,
            url: baseUrl.origin,
            timeout: 60000
        });
    }

    /**
     * Returns whether the Mailgun instance is configured via config/settings
     *
     * @returns {boolean}
     */
    isConfigured() {
        const instance = this.getInstance();
        return !!instance;
    }

    /**
     * Returns configured batch size
     *
     * @returns {number}
     */
    getBatchSize() {
        return this.#config.get('bulkEmail')?.batchSize ?? this.DEFAULT_BATCH_SIZE;
    }

    /**
     * Returns the configured target delivery window in seconds
     * Ghost will attempt to deliver emails evenly distributed over this window
     *
     * Defaults to 0 (no delay) if not set
     *
     * @returns {number}
     */
    getTargetDeliveryWindow() {
        const targetDeliveryWindow = this.#config.get('bulkEmail')?.targetDeliveryWindow;
        // If targetDeliveryWindow is not set or is not a positive integer, return 0
        if (targetDeliveryWindow === undefined || !Number.isInteger(parseInt(targetDeliveryWindow)) || parseInt(targetDeliveryWindow) < 0) {
            return 0;
        }
        return parseInt(targetDeliveryWindow);
    }
};
