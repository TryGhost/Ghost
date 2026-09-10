const moment = require('moment-timezone');
const errors = require('@tryghost/errors');
const logging = require('@tryghost/logging');
const { setTimeout: delay } = require('node:timers/promises');

class NewsletterEmailEventStorage {
  #config;
  #db;
  #membersRepository;
  #models;
  #emailSuppressionList;
  #prometheusClient;
  #pendingUpdates;

  constructor({ config, db, models, membersRepository, emailSuppressionList, prometheusClient }) {
    this.#config = config;
    this.#db = db;
    this.#models = models;
    this.#membersRepository = membersRepository;
    this.#emailSuppressionList = emailSuppressionList;
    this.#prometheusClient = prometheusClient;

    // Initialize pending updates for batched processing
    this.#pendingUpdates = {
      delivered: new Map(), // recipientId -> {timestamp, emailId, memberId}
      opened: new Map(), // recipientId -> {timestamp, emailId, memberId}
      failed: new Map(), // recipientId -> {timestamp, emailId, memberId}
    };

    if (this.#prometheusClient) {
      this.#prometheusClient.registerCounter({
        name: 'email_analytics_events_stored',
        help: 'Number of email analytics events stored',
        labelNames: ['event'],
      });
    }
  }

  async handleDelivered(event) {
    const useBatchProcessing = this.#config.get('emailAnalytics:batchProcessing');

    if (useBatchProcessing) {
      // Accumulate update for batch processing
      const timestamp = moment.utc(event.timestamp).format('YYYY-MM-DD HH:mm:ss');
      const existing = this.#pendingUpdates.delivered.get(event.emailRecipientId);

      // Keep the earliest timestamp (out-of-order protection)
      if (!existing || timestamp < existing.timestamp) {
        this.#pendingUpdates.delivered.set(event.emailRecipientId, {
          timestamp,
          emailId: event.emailId,
          memberId: event.memberId,
        });
      }
    } else {
      // Sequential mode: immediate update
      // To properly handle events that are received out of order (this happens because of polling)
      // only set if delivered_at is null
      const rowCount = await this.#db
        .knex('email_recipients')
        .where('id', '=', event.emailRecipientId)
        .whereNull('delivered_at')
        .update({
          delivered_at: moment.utc(event.timestamp).format('YYYY-MM-DD HH:mm:ss'),
        });
      this.recordEventStored('delivered', rowCount);
    }
  }

  async handleOpened(event) {
    const useBatchProcessing = this.#config.get('emailAnalytics:batchProcessing');

    if (useBatchProcessing) {
      // Accumulate update for batch processing
      const timestamp = moment.utc(event.timestamp).format('YYYY-MM-DD HH:mm:ss');
      const existing = this.#pendingUpdates.opened.get(event.emailRecipientId);

      // Keep the earliest timestamp (out-of-order protection)
      if (!existing || timestamp < existing.timestamp) {
        this.#pendingUpdates.opened.set(event.emailRecipientId, {
          timestamp,
          emailId: event.emailId,
          memberId: event.memberId,
        });
      }
    } else {
      // Sequential mode: immediate update
      // To properly handle events that are received out of order (this happens because of polling)
      // only set if opened_at is null
      const rowCount = await this.#db
        .knex('email_recipients')
        .where('id', '=', event.emailRecipientId)
        .whereNull('opened_at')
        .update({
          opened_at: moment.utc(event.timestamp).format('YYYY-MM-DD HH:mm:ss'),
        });
      this.recordEventStored('opened', rowCount);
    }
  }

  async handlePermanentFailed(event) {
    const useBatchProcessing = this.#config.get('emailAnalytics:batchProcessing');

    if (useBatchProcessing) {
      // Accumulate update for batch processing
      const timestamp = moment.utc(event.timestamp).format('YYYY-MM-DD HH:mm:ss');
      const existing = this.#pendingUpdates.failed.get(event.emailRecipientId);

      // Keep the earliest timestamp (out-of-order protection)
      if (!existing || timestamp < existing.timestamp) {
        this.#pendingUpdates.failed.set(event.emailRecipientId, {
          timestamp,
          emailId: event.emailId,
          memberId: event.memberId,
        });
      }
    } else {
      // Sequential mode: immediate update
      // To properly handle events that are received out of order (this happens because of polling)
      // only set if failed_at is null
      await this.#db
        .knex('email_recipients')
        .where('id', '=', event.emailRecipientId)
        .whereNull('failed_at')
        .update({
          failed_at: moment.utc(event.timestamp).format('YYYY-MM-DD HH:mm:ss'),
        });
    }
    await this.saveFailure('permanent', event);
  }

  async handleTemporaryFailed(event) {
    await this.saveFailure('temporary', event);
  }

  /**
   * @private
   * @param {'temporary'|'permanent'} severity
   * @param {import('./events/email-temporary-bounced-event').EmailTemporaryBouncedEvent|import('./events/email-bounced-event').EmailBouncedEvent} event
   * @param {{transacting?: any}} options
   * @returns
   */
  async saveFailure(severity, event, options = {}) {
    if (!event.error) {
      logging.warn(
        `Missing error information provided for ${severity} failure event with id ${event.id}`,
      );
      return;
    }

    if (!options || !options.transacting) {
      return await this.#models.EmailRecipientFailure.transaction(async (transacting) => {
        await this.saveFailure(severity, event, { transacting });
      });
    }

    // Create a forUpdate transaction
    const existing = await this.#models.EmailRecipientFailure.findOne(
      {
        email_recipient_id: event.emailRecipientId,
      },
      { ...options, require: false, forUpdate: true },
    );

    if (!existing) {
      // Create a new failure
      await this.#models.EmailRecipientFailure.add(
        {
          email_id: event.emailId,
          member_id: event.memberId,
          email_recipient_id: event.emailRecipientId,
          severity,
          message: event.error.message || `Error ${event.error.enhancedCode ?? event.error.code}`,
          code: event.error.code,
          enhanced_code: event.error.enhancedCode,
          failed_at: event.timestamp,
          event_id: event.id,
        },
        { ...options, autoRefresh: false },
      );
    } else {
      if (existing.get('severity') === 'permanent') {
        // Already marked as failed, no need to change anything here
        return;
      }

      if (existing.get('failed_at') > event.timestamp) {
        /// We can get events out of order, so only save the last one
        return;
      }

      // Update the existing failure
      await existing.save(
        {
          severity,
          message: event.error.message || `Error ${event.error.enhancedCode ?? event.error.code}`,
          code: event.error.code,
          enhanced_code: event.error.enhancedCode ?? null,
          failed_at: event.timestamp,
          event_id: event.id,
        },
        { ...options, patch: true, autoRefresh: false },
      );
    }
  }

  async handleUnsubscribed(event) {
    try {
      const result = await this.findNewslettersToKeep(event);

      if (result.status === 'failed') {
        // Leave Mailgun's suppression in place: these events are fetched
        // once and never retried, so it is the only remaining protection.
        return;
      }

      if (result.status === 'ok') {
        await this.#membersRepository.update(
          { newsletters: result.newsletters },
          { id: event.memberId },
        );
      }

      // Remove member from Mailgun's suppression list, only once the local
      // record reflects the unsubscribe or there is no member left to protect
      await this.#emailSuppressionList.removeUnsubscribe(event.email);
    } catch (err) {
      logging.error(err);
    }
  }

  async handleComplained(event) {
    try {
      await this.#models.EmailSpamComplaintEvent.add({
        member_id: event.memberId,
        email_id: event.emailId,
        email_address: event.email,
      });

      // Remove from Mailgun's suppression list so it doesn't affect other sites on the same domain
      await this.#emailSuppressionList.removeComplaint(event.email);
    } catch (err) {
      if (err.code !== 'ER_DUP_ENTRY' && err.code !== 'SQLITE_CONSTRAINT') {
        logging.error(err);
      }
    }
  }

  /**
   * @typedef {{status: 'ok', newsletters: {id: string}[]}
   *     | {status: 'no-member'}
   *     | {status: 'failed'}} FindNewslettersToKeepResult
   */

  /**
   * @param {import('./events/email-unsubscribed-event').EmailUnsubscribedEvent} event
   * @returns {Promise<FindNewslettersToKeepResult>}
   */
  async findNewslettersToKeep(event) {
    try {
      const member = await this.#membersRepository.get(
        { id: event.memberId },
        {
          withRelated: ['newsletters'],
        },
      );

      if (!member) {
        return { status: 'no-member' };
      }

      const existingNewsletters = member.related('newsletters');

      const email = await this.#models.Email.findOne({ id: event.emailId });
      const newsletterToRemove = email.get('newsletter_id');

      return {
        status: 'ok',
        newsletters: existingNewsletters.models
          .filter((newsletter) => newsletter.id !== newsletterToRemove)
          .map((n) => {
            return { id: n.id };
          }),
      };
    } catch (err) {
      logging.error(
        new errors.InternalServerError({
          message: `Could not resolve newsletters to keep for unsubscribe event (member ${event.memberId}, email ${event.emailId})`,
          err,
        }),
      );
      return { status: 'failed' };
    }
  }

  /**
   * Record event stored
   * @param {string} event
   * @param {number} count
   */
  recordEventStored(event, count = 1) {
    try {
      this.#prometheusClient?.getMetric('email_analytics_events_stored')?.inc({ event }, count);
    } catch (err) {
      logging.error('Error recording email analytics event stored', err);
    }
  }

  /**
   * Flush all batched updates to the database
   * @returns {Promise<Array<{emailId: string, delivered: Array<{recipientId: string, memberId: string}>, opened: Array<{recipientId: string, memberId: string}>, failed: Array<{recipientId: string, memberId: string}>}>>}
   */
  async flushBatchedUpdates() {
    const groups = new Map();
    for (const [type, pending] of Object.entries(this.#pendingUpdates)) {
      for (const [recipientId, update] of pending) {
        if (!groups.has(update.emailId)) {
          groups.set(update.emailId, {
            delivered: new Map(),
            opened: new Map(),
            failed: new Map(),
          });
        }
        groups.get(update.emailId)[type].set(recipientId, update);
      }
    }

    const transitions = [];
    for (const emailId of Array.from(groups.keys()).sort()) {
      const updates = groups.get(emailId);
      const transitioned = await this.#transactionWithRetry(async (trx) => {
        const query = trx('email_recipients');
        if (['mysql', 'mysql2'].includes(trx.client.config.client)) {
          // Lock in primary-key order, rather than whichever secondary index
          // the optimizer chooses. Sorting the IN list alone is insufficient.
          query.fromRaw('?? FORCE INDEX (PRIMARY)', ['email_recipients']);
        }
        const recipients = await query
          .select('id', 'member_id', 'delivered_at', 'opened_at', 'failed_at')
          .where('email_id', emailId)
          .where(function () {
            for (const [type, pending] of Object.entries(updates)) {
              if (pending.size) {
                this.orWhere(function () {
                  this.whereIn('id', Array.from(pending.keys()).sort()).whereNull(`${type}_at`);
                });
              }
            }
          })
          .orderBy('id')
          .forUpdate();

        const result = { emailId, delivered: [], opened: [], failed: [] };
        // The locked set, not an affected-row count, determines which members
        // transitioned. Dependent counter writes must use this same transaction.
        for (const [type, pending] of Object.entries(updates)) {
          const eligible = recipients.filter(
            (row) => pending.has(row.id) && row[`${type}_at`] === null,
          );
          if (!eligible.length) {
            continue;
          }
          const bindings = eligible.flatMap(({ id }) => [id, pending.get(id).timestamp]);
          await trx('email_recipients')
            .whereIn(
              'id',
              eligible.map(({ id }) => id),
            )
            .whereNull(`${type}_at`)
            .update({
              [`${type}_at`]: trx.raw(
                `CASE id ${eligible.map(() => 'WHEN ? THEN ?').join(' ')} END`,
                bindings,
              ),
            });
          result[type] = eligible.map(({ id, member_id: memberId }) => ({
            recipientId: id,
            memberId,
          }));
        }
        return result;
      });
      if (
        transitioned.delivered.length ||
        transitioned.opened.length ||
        transitioned.failed.length
      ) {
        this.recordEventStored('delivered', transitioned.delivered.length);
        this.recordEventStored('opened', transitioned.opened.length);
        transitions.push(transitioned);
      }
    }

    for (const pending of Object.values(this.#pendingUpdates)) {
      pending.clear();
    }
    return transitions;
  }

  async #transactionWithRetry(callback) {
    for (let attempt = 0; ; attempt++) {
      try {
        return await this.#db.knex.transaction(callback);
      } catch (error) {
        // Retry the whole rolled-back transaction, never an individual write.
        // Connection/commit errors can have an unknown outcome and must escape.
        if (error.code !== 'ER_LOCK_DEADLOCK' || attempt >= 2) {
          throw error;
        }
        await delay(10 * 2 ** attempt);
      }
    }
  }
}

module.exports = NewsletterEmailEventStorage;
