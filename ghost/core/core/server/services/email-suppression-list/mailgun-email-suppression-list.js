const { EmailSuppressionData, EmailSuppressedEvent } = require('./email-suppression-list');
const DomainEvents = require('@tryghost/domain-events');
const logging = require('@tryghost/logging');
const errors = require('@tryghost/errors');
const assert = require('node:assert/strict');
/** @import {IEmailSuppressionList} from './email-suppression-list' */

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
    this.membersRepository = deps.membersRepository;
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
      await this.Suppression.destroy({
        destroyBy: {
          email: email,
        },
      });
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

  async handleBounce(event) {
    // Normalized provider events classify invalid mailboxes explicitly. Keep
    // the legacy classification for callers that do not yet pass this field.
    const suppress = event.suppress ?? [605, 607].includes(event.error?.code);
    if (suppress) {
      await this.suppressEmail(event, 'bounce');
    }
  }

  async handleComplaint(event) {
    await this.suppressEmail(event, 'spam');
  }

  async suppressEmail(event, reason) {
    assert(this.membersRepository, 'Email suppression must be initialized at boot');
    try {
      await this.Suppression.transaction(async (transacting) => {
        try {
          await this.Suppression.add(
            {
              email: event.email,
              email_id: event.emailId,
              reason,
              created_at: event.timestamp,
            },
            { transacting },
          );
        } catch (err) {
          if (
            !['ER_DUP_ENTRY', 'SQLITE_CONSTRAINT'].includes(err.code) ||
            !(await this.Suppression.findOne({ email: event.email }, { transacting }))
          ) {
            throw err;
          }
        }
        // Resolve and lock the original address, so an old callback cannot
        // disable the member's replacement address. Repair drift on replay too.
        const member = await this.membersRepository.get(
          { email: event.email },
          { transacting, forUpdate: true },
        );
        if (member) {
          await this.membersRepository.update(
            { email_disabled: true },
            { id: member.id, transacting },
          );
        }
      });
    } catch (err) {
      throw new errors.InternalServerError({
        message: 'Could not save email suppression',
        statusCode: 503,
        err,
      });
    }
    // Notifications follow the completed safety writes; they do not own them.
    DomainEvents.dispatch(
      EmailSuppressedEvent.create(
        {
          emailAddress: event.email,
          emailId: event.emailId,
          reason,
        },
        event.timestamp,
      ),
    );
  }

  async init({ membersRepository }) {
    this.membersRepository = membersRepository;
  }
}

module.exports = MailgunEmailSuppressionList;
