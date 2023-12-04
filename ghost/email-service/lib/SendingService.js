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
 * @prop {Recipient[]} recipients
 * @prop {import("./EmailRenderer").ReplacementDefinition[]} replacementDefinitions
 *
 * @typedef {object} IEmailProviderService
 * @prop {(emailData: EmailData, options: EmailSendingOptions) => Promise<EmailProviderSuccessResponse>} send
 * @prop {() => number} getMaximumRecipients
 *
 * @typedef {object} Post
 * @typedef {object} Newsletter
 */

/**
 * @typedef {import("./EmailRenderer")} EmailRenderer
 * @typedef {import("./EmailRenderer").EmailBody} EmailBody
 */

/**
 * @typedef {object} EmailSendingOptions
 * @prop {boolean} clickTrackingEnabled
 * @prop {boolean} openTrackingEnabled
 * @prop {{get(id: string): EmailBody | null, set(id: string, body: EmailBody): void}} [emailBodyCache]
 */

/**
 * @typedef {import("./EmailRenderer").MemberLike} MemberLike
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

    /**
     * @param {object} dependencies
     * @param {IEmailProviderService} dependencies.emailProvider
     * @param {EmailRenderer} dependencies.emailRenderer
     */
    constructor({
        emailProvider,
        emailRenderer
    }) {
        this.#emailProvider = emailProvider;
        this.#emailRenderer = emailRenderer;
    }

    getMaximumRecipients() {
        return this.#emailProvider.getMaximumRecipients();
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
            subject: this.#emailRenderer.getSubject(post),
            from: this.#emailRenderer.getFromAddress(post, newsletter),
            replyTo: this.#emailRenderer.getReplyToAddress(post, newsletter) ?? undefined,
            html: emailBody.html,
            plaintext: emailBody.plaintext,
            recipients,
            emailId: emailId,
            replacementDefinitions: emailBody.replacements
        }, {
            clickTrackingEnabled: !!options.clickTrackingEnabled,
            openTrackingEnabled: !!options.openTrackingEnabled
        });
    }

    /**
     * @private
     * @param {MemberLike[]} members
     * @param {import("./EmailRenderer").ReplacementDefinition[]} replacementDefinitions
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
