const { EmailSuppressionData, EmailSuppressedEvent } = require('./email-suppression-list');
const { SpamComplaintEvent } = require('../email-service/events/spam-complaint-event');
const { EmailBouncedEvent } = require('../email-service/events/email-bounced-event');
const DomainEvents = require('@tryghost/domain-events');
const logging = require('@tryghost/logging');
const models = require('../../models');
/** @import {IEmailSuppressionList} from './email-suppression-list' */

const REPEATED_FAILURE_THRESHOLD = 3;
const ENHANCED_STATUS_CODE = /(?:^|[^\d.])([245]\.\d{1,3}\.\d{1,3})(?![\d.])/;

/**
 * Mailgun only adds invalid recipients to its bounce list when it classifies
 * the failure as a bounce, which leaves most rejected addresses unsuppressed.
 *
 * @param {{code: number, enhancedCode?: string | null, message?: string | null}} error
 * @returns {boolean}
 */
function isUndeliverableAddress({ code, enhancedCode, message }) {
  // Mailgun: the recipient domain has no MX records
  if (code === 498) {
    return true;
  }
  const status = enhancedCode || message?.match(ENHANCED_STATUS_CODE)?.[1];
  return !!status && (status.startsWith('5.1.') || status === '5.2.1');
}

/**
 * @typedef {object} IMailgunAPIClient
 * @prop {(email: string) => Promise<any>} removeBounce
 * @prop {(email: string) => Promise<any>} removeComplaint
 * @prop {(email: string) => Promise<any>} removeUnsubscribe
 */

/**
 * @implements {IEmailSuppressionList}
 */
class MailgunEmailSuppressionList {
  /**
   * @param {object} deps
   * @param {import('bookshelf').Model} deps.Suppression
   * @param {IMailgunAPIClient} deps.apiClient
   */
  constructor(deps) {
    this.Suppression = deps.Suppression;
    this.apiClient = deps.apiClient;
  }

  async removeEmail(email) {
    try {
      await this.apiClient.removeBounce(email);
      await this.apiClient.removeComplaint(email);
      await this.apiClient.removeUnsubscribe(email);
    } catch (err) {
      logging.error(err);
      return false;
    }

    try {
      await this.Suppression.where({ email: email }).destroy({ require: false });
    } catch (err) {
      logging.error(err);
      return false;
    }

    return true;
  }

  async removeUnsubscribe(email) {
    try {
      await this.apiClient.removeUnsubscribe(email);
    } catch (err) {
      logging.error(err);
      return false;
    }
  }

  async removeComplaint(email) {
    try {
      await this.apiClient.removeComplaint(email);
    } catch (err) {
      logging.error(err);
      return false;
    }
  }

  async getSuppressionData(email) {
    try {
      const model = await this.Suppression.findOne({
        email: email,
      });

      if (!model) {
        return new EmailSuppressionData(false);
      }

      return new EmailSuppressionData(true, {
        timestamp: model.get('created_at'),
        reason: model.get('reason') === 'spam' ? 'spam' : 'fail',
      });
    } catch (err) {
      logging.error(err);
      return new EmailSuppressionData(false);
    }
  }

  async getBulkSuppressionData(emails) {
    if (emails.length === 0) {
      return [];
    }

    try {
      const collection = await this.Suppression.findAll({
        filter: `email:[${emails.map((email) => `'${email}'`).join(',')}]`,
      });

      return emails.map((email) => {
        const model = collection.models.find((m) => m.get('email') === email);

        if (!model) {
          return new EmailSuppressionData(false);
        }

        return new EmailSuppressionData(true, {
          timestamp: model.get('created_at'),
          reason: model.get('reason') === 'spam' ? 'spam' : 'fail',
        });
      });
    } catch (err) {
      logging.error(err);
      return emails.map(() => new EmailSuppressionData(false));
    }
  }

  async init() {
    this.Suppression = models.Suppression;
    const handleEvent = (reason) => async (event) => {
      if (reason === 'bounce') {
        if (!Number.isInteger(event.error?.code)) {
          return;
        }
        const suppressedByMailgun = event.error.code === 607 || event.error.code === 605;
        if (!suppressedByMailgun && !(await this.isRepeatedlyUndeliverable(event))) {
          return;
        }
      }
      try {
        await this.Suppression.add({
          email: event.email,
          email_id: event.emailId,
          reason: reason,
          created_at: event.timestamp,
        });
      } catch (err) {
        if (err.code !== 'ER_DUP_ENTRY' && err.code !== 'SQLITE_CONSTRAINT') {
          logging.error(err);
          return;
        }
        // Suppression already exists — still dispatch so any drifted
        // member state (e.g. email_disabled=false) gets corrected.
        logging.info(
          `Re-dispatching EmailSuppressedEvent for existing suppression (${reason}): ${event.email}`,
        );
      }
      DomainEvents.dispatch(
        EmailSuppressedEvent.create(
          {
            emailAddress: event.email,
            emailId: event.emailId,
            reason: reason,
          },
          event.timestamp,
        ),
      );
    };
    DomainEvents.subscribe(EmailBouncedEvent, handleEvent('bounce'));
    DomainEvents.subscribe(SpamComplaintEvent, handleEvent('spam'));
  }

  /**
   * @param {import('../email-service/events/email-bounced-event').EmailBouncedEvent} event
   * @returns {Promise<boolean>}
   */
  async isRepeatedlyUndeliverable(event) {
    if (!isUndeliverableAddress(event.error)) {
      return false;
    }

    const latestFailures = await models.Base.knex('email_recipients')
      .leftJoin('email_recipient_failures', function () {
        this.on('email_recipient_failures.email_recipient_id', '=', 'email_recipients.id').andOnVal(
          'email_recipient_failures.severity',
          '=',
          'permanent',
        );
      })
      .where('email_recipients.member_id', event.memberId)
      .where('email_recipients.member_email', event.email)
      .whereNotNull('email_recipients.processed_at')
      .orderBy('email_recipients.processed_at', 'desc')
      .limit(REPEATED_FAILURE_THRESHOLD)
      .select(
        'email_recipient_failures.code',
        'email_recipient_failures.enhanced_code',
        'email_recipient_failures.message',
      );

    return (
      latestFailures.length === REPEATED_FAILURE_THRESHOLD &&
      latestFailures.every(
        (failure) =>
          failure.code !== null &&
          isUndeliverableAddress({
            code: failure.code,
            enhancedCode: failure.enhanced_code,
            message: failure.message,
          }),
      )
    );
  }
}

module.exports = MailgunEmailSuppressionList;
