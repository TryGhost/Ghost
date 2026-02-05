const validator = require('@tryghost/validator');
const logging = require('@tryghost/logging');

/**
 * @typedef {object} EmailData
 * @prop {string} html
 * @prop {string} plaintext
 * @prop {string} subject
 * @prop {string} from
 * @prop {string} emailId
 * @prop {string} [replyTo]
 * @prop {string} [domainOverride]
 * @prop {Recipient[]} recipients
 * @prop {import("./email-renderer").ReplacementDefinition[]} replacementDefinitions
 *
 * @typedef {object} IEmailProviderService
 * @prop {(emailData: EmailData, options: EmailSendingOptions) => Promise<EmailProviderSuccessResponse>} send
 * @prop {() => number} getMaximumRecipients
 * @prop {() => number} getTargetDeliveryWindow
 *
 * @typedef {object} Post
 * @typedef {object} Newsletter
 */

/**
 * @typedef {import("./email-renderer")} EmailRenderer
 * @typedef {import("./email-renderer").EmailBody} EmailBody
 */

/**
 * @typedef {import("../email-address/email-address-service").EmailAddressService} EmailAddressService
 */

/**
 * @typedef {object} EmailSendingOptions
 * @prop {boolean} clickTrackingEnabled
 * @prop {boolean} openTrackingEnabled
 * @prop {boolean} useFallbackAddress
 * @prop {Date} deliveryTime
 * @prop {{get(id: string): EmailBody | null, set(id: string, body: EmailBody): void}} [emailBodyCache]
 */

/**
 * @typedef {import("./email-renderer").MemberLike} MemberLike
 */

/**
 * @typedef {object} Recipient
 * @prop {string} email
 * @prop {Replacement[]} replacements
 */

/**
 * @typedef {object} Replacement
 * @prop {string} id
 * @prop {RegExp} token
 * @prop {string} value
 */

/**
 * @typedef {object} EmailProviderSuccessResponse
 * @prop {string} id
 */

class SendingService {
    #emailProvider;
    #emailRenderer;
    #emailAddressService;

    /**
     * @param {object} dependencies
     * @param {IEmailProviderService} dependencies.emailProvider
     * @param {EmailRenderer} dependencies.emailRenderer
     * @param {EmailAddressService} dependencies.emailAddressService
     */
    constructor({
        emailProvider,
        emailRenderer,
        emailAddressService
    }) {
        this.#emailProvider = emailProvider;
        this.#emailRenderer = emailRenderer;
        this.#emailAddressService = emailAddressService;
    }

    getMaximumRecipients() {
        return this.#emailProvider.getMaximumRecipients();
    }

    /**
     * Returns the configured target delivery window in seconds
     *
     * @returns {number}
     */
    getTargetDeliveryWindow() {
        return this.#emailProvider.getTargetDeliveryWindow();
    }

    /**
     * Send a given post, rendered for a given newsletter and segment to the members provided in the list
     * @param {object} data
     * @param {Post} data.post
     * @param {Newsletter} data.newsletter
     * @param {string|null} data.segment
     * @param {string|null} data.emailId
     * @param {MemberLike[]} data.members
     * @param {EmailSendingOptions} options
     * @returns {Promise<EmailProviderSuccessResponse>}
    */
    async send({post, newsletter, segment, members, emailId}, options) {
        const cacheId = emailId + '-' + (segment ?? 'null');
        const isTestEmail = options.isTestEmail ?? false;

        /**
         * @type {EmailBody | null}
         */
        let emailBody = null;

        if (options.emailBodyCache) {
            emailBody = options.emailBodyCache.get(cacheId);
        }

        if (!emailBody) {
            emailBody = await this.#emailRenderer.renderBody(
                post,
                newsletter,
                segment,
                {
                    clickTrackingEnabled: !!options.clickTrackingEnabled
                }
            );
            if (options.emailBodyCache) {
                options.emailBodyCache.set(cacheId, emailBody);
            }
        }

        const recipients = this.buildRecipients(members, emailBody.replacements);
        return await this.#emailProvider.send({
            subject: this.#emailRenderer.getSubject(post, isTestEmail),
            from: this.#emailRenderer.getFromAddress(post, newsletter, !!options.useFallbackAddress),
            replyTo: this.#emailRenderer.getReplyToAddress(post, newsletter, !!options.useFallbackAddress) ?? undefined,
            html: emailBody.html,
            plaintext: emailBody.plaintext,
            recipients,
            emailId: emailId,
            replacementDefinitions: emailBody.replacements,
            domainOverride: options.useFallbackAddress ? this.#emailAddressService.fallbackDomain : undefined
        }, {
            clickTrackingEnabled: !!options.clickTrackingEnabled,
            openTrackingEnabled: !!options.openTrackingEnabled,
            useFallbackAddress: !!options.useFallbackAddress,
            ...(options.deliveryTime && {deliveryTime: options.deliveryTime})
        });
    }

    /**
     * @private
     * @param {MemberLike[]} members
     * @param {import("./email-renderer").ReplacementDefinition[]} replacementDefinitions
     * @returns {Recipient[]}
     */
    buildRecipients(members, replacementDefinitions) {
        return members.map((member) => {
            return {
                email: member.email?.trim(),
                replacements: replacementDefinitions.map((def) => {
                    return {
                        id: def.id,
                        token: def.token,
                        value: def.getValue(member) || ''
                    };
                })
            };
        }).filter((recipient) => {
            // Remove invalid recipient email addresses
            const isValidRecipient = validator.isEmail(recipient.email, {legacy: false});
            if (!isValidRecipient) {
                logging.warn(`Removed recipient ${recipient.email} from list because it is not a valid email address`);
            }
            return isValidRecipient;
        });
    }
}

module.exports = SendingService;
