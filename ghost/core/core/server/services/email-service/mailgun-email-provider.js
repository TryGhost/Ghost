const logging = require('@tryghost/logging');
const errors = require('@tryghost/errors');
const debug = require('@tryghost/debug')('email-service:mailgun-provider-service');
const { escapeExpression } = require('handlebars');

/**
 * @typedef {object} Config
 * @prop {(key: string) => unknown} get
 */

/**
 * @typedef {object} Recipient
 * @prop {string} email
 * @prop {Replacement[]} replacements
 */

/**
 * @typedef {object} Replacement
 * @prop {string} token
 * @prop {string} value
 * @prop {string} id
 */

/**
 * @typedef {object} EmailSendingOptions
 * @prop {boolean} clickTrackingEnabled
 * @prop {boolean} openTrackingEnabled
 * @prop {Date} deliveryTime
 */

/**
 * @typedef {object} EmailProviderSuccessResponse
 * @prop {string} id
 */

class MailgunEmailProvider {
  #mailgunClient;
  #config;

  /**
   * @param {object} dependencies
   * @param {import('../lib/mailgun-client')} dependencies.mailgunClient - mailgun client to send emails
   * @param {Config} dependencies.config
   */
  constructor({ mailgunClient, config }) {
    this.#mailgunClient = mailgunClient;
    this.#config = config;
  }

  #createRecipientData(replacements, htmlEscapedIds) {
    let recipientData = {};

    recipientData = replacements.reduce((acc, replacement) => {
      const { id, value } = replacement;
      acc[id] = value;
      // Mailgun's recipient-variables substitution is a simple string replace with
      // no HTML awareness, and the same value is used for both the html and plaintext
      // bodies. Member-controlled values get an extra, escaped variant that only the
      // html body points at. Trusted server-generated values (urls, uuids, hmacs) are
      // skipped so their URLs don't end up entity-encoded inside hrefs.
      if (htmlEscapedIds.has(id)) {
        acc[`${id}_html`] = typeof value === 'string' ? escapeExpression(value) : value;
      }
      return acc;
    }, {});

    return recipientData;
  }

  #updateRecipientVariables(data, replacementDefinitions, isHtml) {
    for (const def of replacementDefinitions) {
      const useHtmlVariant = isHtml && !def.trusted;
      data = data.replace(def.token, `%recipient.${def.id}${useHtmlVariant ? '_html' : ''}%`);
    }
    return data;
  }

  /**
   * Create mailgun error message for storing in the database
   * @param {Object} error
   * @param {string} error.message
   * @param {string} error.details
   * @returns {string}
   */
  #createMailgunErrorMessage(error) {
    const message =
      (error?.message || 'Mailgun Error') + (error?.details ? ': ' + error.details : '');
    return message.slice(0, 2000);
  }

  /**
   * Send an email using the Mailgun API
   * @param {import('./sending-service').EmailData} data
   * @param {EmailSendingOptions} options
   * @returns {Promise<EmailProviderSuccessResponse>}
   */
  async send(data, options) {
    const {
      subject,
      html,
      plaintext,
      from,
      domainOverride,
      replyTo,
      emailId,
      recipients,
      replacementDefinitions,
    } = data;

    logging.info(`Sending email to ${recipients.length} recipients`);
    const startTime = Date.now();
    debug(`sending message to ${recipients.length} recipients`);

    try {
      const messageData = {
        subject,
        html,
        plaintext,
        from,
        replyTo,
        tags: ['bulk-email'],
        domainOverride,
        id: emailId,
        track_opens: !!options.openTrackingEnabled,
        track_clicks: !!options.clickTrackingEnabled,
      };

      const mailgunTagFromConfig = this.#config.get('bulkEmail:mailgun:tag');
      if (typeof mailgunTagFromConfig === 'string' && mailgunTagFromConfig.length > 0) {
        messageData.tags.push(mailgunTagFromConfig);
      }

      if (options.deliveryTime && options.deliveryTime instanceof Date) {
        messageData.deliveryTime = options.deliveryTime;
      }

      // create recipient data for Mailgun using replacement definitions
      const htmlEscapedIds = new Set(
        replacementDefinitions.filter((def) => !def.trusted).map((def) => def.id),
      );
      const recipientData = recipients.reduce((acc, recipient) => {
        acc[recipient.email] = this.#createRecipientData(recipient.replacements, htmlEscapedIds);
        return acc;
      }, {});

      // update content to use Mailgun variable syntax for all replacements
      ['html', 'plaintext'].forEach((key) => {
        if (messageData[key]) {
          messageData[key] = this.#updateRecipientVariables(
            messageData[key],
            replacementDefinitions,
            key === 'html',
          );
        }
      });

      // send the email using Mailgun
      // uses empty replacements array as we've already replaced all tokens with Mailgun variables
      const response = await this.#mailgunClient.send(messageData, recipientData, []);

      debug(`sent message (${Date.now() - startTime}ms)`);
      logging.info(`Sent message (${Date.now() - startTime}ms)`);

      // Return mailgun provider id, trim <> from response
      return {
        id: response.id.trim().replace(/^<|>$/g, ''),
      };
    } catch (e) {
      let ghostError;
      if (e.error && e.messageData) {
        const { error, messageData } = e;

        // REF: possible mailgun errors https://documentation.mailgun.com/en/latest/api-intro.html#status-codes
        ghostError = new errors.EmailError({
          statusCode: error.status,
          message: this.#createMailgunErrorMessage(error),
          errorDetails: JSON.stringify({ error, messageData }),
          context: `Mailgun Error ${error.status}: ${error.details}`,
          help: `https://docs.ghost.org/newsletters/#bulk-email-configuration`,
          code: 'BULK_EMAIL_SEND_FAILED',
        });
      } else {
        ghostError = new errors.EmailError({
          statusCode: undefined,
          message: this.#createMailgunErrorMessage(e),
          errorDetails: undefined,
          context: e.context || 'Mailgun Error',
          code: 'BULK_EMAIL_SEND_FAILED',
        });
      }

      debug(`failed to send message (${Date.now() - startTime}ms)`);

      throw ghostError;
    }
  }

  getMaximumRecipients() {
    return this.#mailgunClient.getBatchSize();
  }

  /**
   * Returns the configured delay between batches in milliseconds
   *
   * @returns {number}
   */
  getTargetDeliveryWindow() {
    return this.#mailgunClient.getTargetDeliveryWindow();
  }
}

module.exports = MailgunEmailProvider;
