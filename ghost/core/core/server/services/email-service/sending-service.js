const validator = require('@tryghost/validator');
const logging = require('@tryghost/logging');
const errors = require('@tryghost/errors');
const { recipientVerificationError } = require('./recipient-accounting');

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
 * @prop {Map<string, EmailBody>} [emailBodyCache]
 * @prop {boolean} [recipientAccounting]
 * @prop {string} [batchId]
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
 * @prop {string|null} id
 * @prop {number} [submittedCount]
 * @prop {number} [submissionExcludedCount]
 */

class SendingService {
  #emailProvider;
  #emailRenderer;
  #emailAddressService;
  #sentry;

  /**
   * @param {object} dependencies
   * @param {IEmailProviderService} dependencies.emailProvider
   * @param {EmailRenderer} dependencies.emailRenderer
   * @param {EmailAddressService} dependencies.emailAddressService
   * @param {object} [dependencies.sentry]
   */
  constructor({ emailProvider, emailRenderer, emailAddressService, sentry }) {
    this.#emailProvider = emailProvider;
    this.#emailRenderer = emailRenderer;
    this.#emailAddressService = emailAddressService;
    this.#sentry = sentry;
  }

  getMaximumRecipients() {
    return this.#emailProvider.getMaximumRecipients();
  }

  /**
   * Returns the configured target delivery window in milliseconds
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
  async send(data, options) {
    return this.sendMessage(await this.buildMessage(data, options));
  }

  // Construct once outside the provider retry loop so exclusions, recipient
  // replacements, and the intended payload stay fixed across uncertain retries.
  async buildMessage({ post, newsletter, segment, members, emailId }, options) {
    const cacheId = emailId + '-' + (segment ?? 'null');
    const isTestEmail = options.isTestEmail ?? false;

    /**
     * @type {EmailBody | undefined}
     */
    let emailBody;

    if (options.emailBodyCache) {
      emailBody = options.emailBodyCache.get(cacheId);
    }

    if (!emailBody) {
      emailBody = await this.#emailRenderer.renderBody(post, newsletter, segment, {
        clickTrackingEnabled: !!options.clickTrackingEnabled,
      });
      if (options.emailBodyCache) {
        options.emailBodyCache.set(cacheId, emailBody);
      }
    }

    const { recipients, excludedCount } = this.buildRecipients(
      members,
      emailBody.replacements,
      options.recipientAccounting ? { emailId, batchId: options.batchId } : undefined,
    );
    if (options.recipientAccounting && members.length !== recipients.length + excludedCount) {
      throw recipientVerificationError(emailId, 'message_recipient_counts', {
        batch_id: options.batchId,
        expected: members.length,
        actual:
          Number.isSafeInteger(excludedCount) && excludedCount >= 0
            ? recipients.length + excludedCount
            : null,
        recipient_count: recipients.length,
        submission_excluded_count: excludedCount,
      });
    }
    return {
      data: {
        subject: this.#emailRenderer.getSubject(post, isTestEmail),
        from: this.#emailRenderer.getFromAddress(post, newsletter, !!options.useFallbackAddress),
        replyTo:
          this.#emailRenderer.getReplyToAddress(post, newsletter, !!options.useFallbackAddress) ??
          undefined,
        html: emailBody.html,
        plaintext: emailBody.plaintext,
        recipients,
        emailId: emailId,
        replacementDefinitions: emailBody.replacements,
        domainOverride: options.useFallbackAddress
          ? this.#emailAddressService.fallbackDomain
          : undefined,
      },
      options: {
        clickTrackingEnabled: !!options.clickTrackingEnabled,
        openTrackingEnabled: !!options.openTrackingEnabled,
        useFallbackAddress: !!options.useFallbackAddress,
        ...(options.deliveryTime && { deliveryTime: options.deliveryTime }),
        ...(options.recipientAccounting
          ? { expectedRecipientCount: members.length - excludedCount, batchId: options.batchId }
          : {}),
      },
      ...(options.recipientAccounting ? { submissionExcludedCount: excludedCount } : {}),
    };
  }

  async sendMessage(message) {
    if (message.submissionExcludedCount !== undefined && message.data.recipients.length === 0) {
      return {
        id: null,
        submittedCount: 0,
        submissionExcludedCount: message.submissionExcludedCount,
      };
    }
    const response = await this.#emailProvider.send(message.data, message.options);
    if (message.submissionExcludedCount === undefined) {
      return response;
    }
    return {
      ...response,
      submittedCount: message.data.recipients.length,
      submissionExcludedCount: message.submissionExcludedCount,
    };
  }

  /**
   * @private
   * @param {MemberLike[]} members
   * @param {import("./email-renderer").ReplacementDefinition[]} replacementDefinitions
   * @param {{emailId: string|null, batchId?: string}} [accounting]
   * @returns {{recipients: Recipient[], excludedCount: number}}
   */
  buildRecipients(members, replacementDefinitions, accounting) {
    let excludedCount = 0;
    const recipients = members
      .map((member) => {
        return {
          email: member.email?.trim(),
          replacements: replacementDefinitions.map((def) => {
            return {
              id: def.id,
              token: def.token,
              value: def.getValue(member) || '',
            };
          }),
        };
      })
      .filter((recipient, index) => {
        // Remove invalid recipient email addresses
        const isValidRecipient = validator.isEmail(recipient.email, { legacy: false });
        if (!isValidRecipient) {
          excludedCount += 1;
          if (accounting) {
            const error = new errors.EmailError({
              code: 'BULK_EMAIL_INVALID_RECIPIENT',
              message:
                'Recipient excluded from newsletter submission due to an invalid email address',
              errorDetails: JSON.stringify({
                email_id: accounting.emailId,
                batch_id: accounting.batchId,
                member_id: members[index].id,
                reason: 'invalid_email_address',
              }),
            });
            logging.error(error);
            this.#sentry?.captureException(error);
          } else {
            logging.warn(
              `Removed recipient ${recipient.email} from list because it is not a valid email address`,
            );
          }
        }
        return isValidRecipient;
      });
    return { recipients, excludedCount };
  }
}

module.exports = SendingService;
