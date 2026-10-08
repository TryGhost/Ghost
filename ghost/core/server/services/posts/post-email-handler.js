const { BadRequestError } = require('@tryghost/errors');
const logging = require('@tryghost/logging');
const tpl = require('@tryghost/tpl');
const {
  RETRY_UNKNOWN_OUTCOME_CODE,
  RETRY_NOT_FAILED_CODE,
} = require('../email-service/email-service');

const messages = {
  invalidEmailSegment: "The email segment parameter doesn't contain a valid filter",
};

const EMAIL_SENDING_STATUSES = ['published', 'sent'];

class PostEmailHandler {
  /**
   * @param {Object} dependencies
   * @param {Object} dependencies.models
   * @param {Object} dependencies.emailService
   */
  constructor({ models, emailService }) {
    this.models = models;
    this.emailService = emailService;
  }

  /**
   * Validates email can be sent before saving the post (if an email will be sent)
   *
   * @param {import('@tryghost/api-framework').Frame} frame
   * @returns {Promise<import('../email-service/email-service').EmailPreflight|null>}
   */
  async validateBeforeSave(frame) {
    const newStatus = frame.data.posts[0].status;

    if (!EMAIL_SENDING_STATUSES.includes(newStatus)) {
      return null;
    }

    const existingPost = await this.models.Post.findOne(
      { id: frame.options.id, status: 'all' },
      {
        columns: ['id', 'status', 'newsletter_id', 'email_recipient_filter'],
        transacting: frame.options.transacting,
      },
    );
    const previousStatus = existingPost?.get('status');
    const existingNewsletterId = existingPost?.get('newsletter_id');

    const hasNewsletter = frame.options.newsletter || existingNewsletterId;
    const sendingEmail = hasNewsletter && this.shouldSendEmail(newStatus, previousStatus);

    if (!sendingEmail) {
      return null;
    }

    // A post keeps the newsletter and audience it already has, as the Post model does on save
    const emailRecipientFilter = existingNewsletterId
      ? existingPost.get('email_recipient_filter')
      : frame.options.email_segment || 'all';

    await this.validateEmailRecipientFilter(emailRecipientFilter);

    const newsletter = await this.getNewsletter(frame, existingPost);

    const { emailCount, csdEmailCount } = await this.emailService.checkCanSendEmail(
      newsletter,
      emailRecipientFilter,
    );

    return { newsletter, emailRecipientFilter, emailCount, csdEmailCount };
  }

  /**
   * Validates the email recipient filter is valid
   *
   * @param {string} emailRecipientFilter
   * @returns {Promise<void>}
   */
  async validateEmailRecipientFilter(emailRecipientFilter) {
    if (!emailRecipientFilter || emailRecipientFilter === 'all') {
      return;
    }

    try {
      await this.models.Member.findPage({ filter: emailRecipientFilter, limit: 1 });
    } catch (err) {
      throw new BadRequestError({
        message: tpl(messages.invalidEmailSegment),
        context: err.message,
      });
    }
  }

  /**
   * Retrieves the newsletter the post will be saved with: the one it has, otherwise the one requested
   *
   * @param {import('@tryghost/api-framework').Frame} frame
   * @param {Object|null} existingPost
   * @returns {Promise<Object|null>}
   */
  async getNewsletter(frame, existingPost) {
    if (frame.options.newsletter && !existingPost?.get('newsletter_id')) {
      return this.models.Newsletter.findOne(
        { slug: frame.options.newsletter },
        { transacting: frame.options.transacting },
      );
    }

    if (existingPost?.get('newsletter_id')) {
      return this.models.Newsletter.findOne(
        { id: existingPost.get('newsletter_id') },
        { transacting: frame.options.transacting },
      );
    }

    return null;
  }

  /**
   * Creates a new newsletter email inside the transaction that publishes the post, so the post
   * is only published if its email is created. Sending, or retrying a failed email, waits for
   * the commit.
   *
   * @param {Object} model - The saved post model
   * @param {Object} [options]
   * @param {import('../email-service/email-service').EmailPreflight|null} [options.preflight] - Result of validateBeforeSave, passed through to createEmail
   * @param {object} [options.transacting]
   * @returns {Promise<(() => Promise<void>)|undefined>} Sends the email; call it once the transaction has committed
   */
  async createOrRetryEmail(model, { preflight, transacting } = {}) {
    if (!model.get('newsletter_id')) {
      return;
    }

    const sendEmail =
      model.wasChanged() && this.shouldSendEmail(model.get('status'), model.previous('status'));

    if (!sendEmail) {
      return;
    }

    const postEmail = model.relations.email;

    if (!postEmail) {
      const email = await this.emailService.createEmail(model, { preflight, transacting });
      model.relations.email = email;
      model.set('email', email);
      return async () => {
        await this.emailService.scheduleEmail(email);
      };
    }

    if (postEmail.get('status') === 'failed') {
      // Retrying reads the post outside the transaction, so it must be published first.
      return async () => {
        const email = await this.#retryEmail(postEmail, model.id);
        if (email) {
          model.relations.email = email;
          model.set('email', email);
        }
      };
    }
  }

  async #retryEmail(email, postId) {
    try {
      return await this.emailService.retryEmail(email);
    } catch (err) {
      if (err.code === RETRY_UNKNOWN_OUTCOME_CODE) {
        // The post is already saved. An unknown delivery outcome only withholds
        // the resend, leaving the email failed.
        logging.warn(
          `Post ${postId} was saved without retrying email ${email.id}: delivery outcome is unknown`,
        );
        return;
      }
      if (err.code !== RETRY_NOT_FAILED_CODE) {
        throw err;
      }
      // Publishing is already committed. A concurrent retry that claimed the
      // email satisfies this side effect; the direct retry API still rejects it.
      await email.refresh();
      if (!['pending', 'submitting', 'submitted'].includes(email.get('status'))) {
        throw err;
      }
      return email;
    }
  }

  /**
   * Calculates if the email should be tried to be sent out
   *
   * @param {string} currentStatus current status from the post model
   * @param {string} previousStatus previous status from the post model
   * @returns {boolean}
   */
  shouldSendEmail(currentStatus, previousStatus) {
    return (
      EMAIL_SENDING_STATUSES.includes(currentStatus) &&
      !EMAIL_SENDING_STATUSES.includes(previousStatus)
    );
  }
}

module.exports = PostEmailHandler;
