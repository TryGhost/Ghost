const moment = require('moment-timezone');
const errors = require('@tryghost/errors');
const logging = require('@tryghost/logging');

class NewsletterEmailEventStorage {
  #config;
  #db;
  #membersRepository;
  #models;
  #emailSuppressionList;
  #prometheusClient;
  #settingsCache;
  #pendingUpdates;
  #flushStageHook;
  #recipientIdCollation;

  constructor({
    config,
    db,
    models,
    membersRepository,
    emailSuppressionList,
    prometheusClient,
    settingsCache,
    flushStageHook,
  }) {
    this.#config = config;
    this.#db = db;
    this.#models = models;
    this.#membersRepository = membersRepository;
    this.#emailSuppressionList = emailSuppressionList;
    this.#prometheusClient = prometheusClient;
    this.#settingsCache = settingsCache;
    this.#flushStageHook = flushStageHook;

    // Initialize pending updates for batched processing
    this.#pendingUpdates = {
      delivered: new Map(), // recipientId -> timestamp
      opened: new Map(), // recipientId -> timestamp
      failed: new Map(), // recipientId -> timestamp
      lastSeen: new Map(), // memberId -> latest opened timestamp
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
      if (!existing || timestamp < existing) {
        this.#pendingUpdates.delivered.set(event.emailRecipientId, timestamp);
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
      if (!existing || timestamp < existing) {
        this.#pendingUpdates.opened.set(event.emailRecipientId, timestamp);
      }
      const existingLastSeen = this.#pendingUpdates.lastSeen.get(event.memberId);
      if (!existingLastSeen || timestamp > existingLastSeen) {
        this.#pendingUpdates.lastSeen.set(event.memberId, timestamp);
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
      if (!existing || timestamp < existing) {
        this.#pendingUpdates.failed.set(event.emailRecipientId, timestamp);
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
   * @returns {Promise<void>}
   */
  async flushBatchedUpdates() {
    const deliveredCount = this.#pendingUpdates.delivered.size;
    const openedCount = this.#pendingUpdates.opened.size;
    const failedCount = this.#pendingUpdates.failed.size;

    if (deliveredCount === 0 && openedCount === 0 && failedCount === 0) {
      return; // Nothing to flush
    }

    const pending = {
      delivered: new Map(this.#pendingUpdates.delivered),
      opened: new Map(this.#pendingUpdates.opened),
      failed: new Map(this.#pendingUpdates.failed),
      lastSeen: new Map(this.#pendingUpdates.lastSeen),
    };
    const recipientIds = Array.from(
      new Set([...pending.delivered.keys(), ...pending.opened.keys(), ...pending.failed.keys()]),
    ).sort();

    const transitions = await this.#db.knex.transaction(async (transaction) => {
      const recipients = await transaction('email_recipients')
        .select('id', 'email_id', 'member_id', 'delivered_at', 'opened_at', 'failed_at')
        .whereIn('id', recipientIds)
        .orderBy('id')
        .forUpdate();

      await this.#onFlushStage('after-lock');

      const transitioned = recipients
        .map((recipient) => ({
          id: recipient.id,
          emailId: recipient.email_id,
          memberId: recipient.member_id,
          deliveredAt:
            recipient.delivered_at === null ? pending.delivered.get(recipient.id) : undefined,
          openedAt: recipient.opened_at === null ? pending.opened.get(recipient.id) : undefined,
          failedAt: recipient.failed_at === null ? pending.failed.get(recipient.id) : undefined,
        }))
        .filter(({ deliveredAt, openedAt, failedAt }) => deliveredAt || openedAt || failedAt);

      if (transitioned.length > 0) {
        await this.#applyRecipientTransitions(transaction, transitioned);
      }
      await this.#onFlushStage('after-recipient-update');

      if (transitioned.length > 0) {
        await this.#incrementEmailCounters(transaction, transitioned);
      }
      await this.#onFlushStage('after-email-update');

      await this.#updateMemberState(transaction, transitioned, pending.lastSeen);
      await this.#onFlushStage('after-member-update');
      await this.#onFlushStage('before-commit');

      return transitioned;
    });

    await this.#onFlushStage('after-commit');

    // Clear the pending updates
    this.#pendingUpdates.delivered.clear();
    this.#pendingUpdates.opened.clear();
    this.#pendingUpdates.failed.clear();
    this.#pendingUpdates.lastSeen.clear();

    this.recordEventStored(
      'delivered',
      transitions.filter(({ deliveredAt }) => deliveredAt).length,
    );
    this.recordEventStored('opened', transitions.filter(({ openedAt }) => openedAt).length);
    this.recordEventStored('failed', transitions.filter(({ failedAt }) => failedAt).length);
  }

  async #onFlushStage(stage) {
    await this.#flushStageHook?.(stage);
  }

  async #getRecipientIdCollation(connection) {
    if (this.#recipientIdCollation) {
      return this.#recipientIdCollation;
    }

    const column = await connection('information_schema.columns')
      .select('COLLATION_NAME as collation_name')
      .whereRaw('TABLE_SCHEMA = DATABASE()')
      .where({ TABLE_NAME: 'email_recipients', COLUMN_NAME: 'id' })
      .first();
    if (!column?.collation_name || !/^[a-z0-9_]+$/.test(column.collation_name)) {
      throw new errors.InternalServerError({
        message: 'Could not determine a safe collation for email_recipients.id',
      });
    }
    this.#recipientIdCollation = column.collation_name;
    return this.#recipientIdCollation;
  }

  async #applyRecipientTransitions(transaction, transitions) {
    if (transaction.client.config.client.includes('mysql')) {
      const collation = await this.#getRecipientIdCollation(transaction);
      const payload = JSON.stringify(
        transitions.map(({ id, deliveredAt, openedAt, failedAt }) => ({
          id,
          delivered_at: deliveredAt || null,
          opened_at: openedAt || null,
          failed_at: failedAt || null,
        })),
      );
      await transaction.raw(
        `
          UPDATE email_recipients AS recipient
          JOIN JSON_TABLE(
            ?,
            '$[*]' COLUMNS (
              id CHAR(24) CHARACTER SET utf8mb4 COLLATE ${collation} PATH '$.id',
              delivered_at DATETIME PATH '$.delivered_at',
              opened_at DATETIME PATH '$.opened_at',
              failed_at DATETIME PATH '$.failed_at'
            )
          ) AS pending ON pending.id = recipient.id
          SET
            recipient.delivered_at = COALESCE(pending.delivered_at, recipient.delivered_at),
            recipient.opened_at = COALESCE(pending.opened_at, recipient.opened_at),
            recipient.failed_at = COALESCE(pending.failed_at, recipient.failed_at)
        `,
        [payload],
      );
      return;
    }

    for (const [column, property] of [
      ['delivered_at', 'deliveredAt'],
      ['opened_at', 'openedAt'],
      ['failed_at', 'failedAt'],
    ]) {
      const updates = transitions.filter((transition) => transition[property]);
      if (updates.length === 0) {
        continue;
      }
      const cases = updates.map(() => 'WHEN ? THEN ?').join(' ');
      const bindings = updates.flatMap((transition) => [transition.id, transition[property]]);
      const ids = updates.map(({ id }) => id);
      await transaction.raw(
        `UPDATE email_recipients SET ${column} = CASE id ${cases} ELSE ${column} END WHERE id IN (${ids.map(() => '?').join(',')})`,
        [...bindings, ...ids],
      );
    }
  }

  async #incrementEmailCounters(transaction, transitions) {
    const incrementsByEmail = new Map();
    for (const transition of transitions) {
      const increments = incrementsByEmail.get(transition.emailId) || {
        delivered: 0,
        opened: 0,
        failed: 0,
      };
      increments.delivered += transition.deliveredAt ? 1 : 0;
      increments.opened += transition.openedAt ? 1 : 0;
      increments.failed += transition.failedAt ? 1 : 0;
      incrementsByEmail.set(transition.emailId, increments);
    }

    const emailIds = Array.from(incrementsByEmail.keys());
    const counterSql = [];
    const bindings = [];
    for (const [column, property] of [
      ['delivered_count', 'delivered'],
      ['opened_count', 'opened'],
      ['failed_count', 'failed'],
    ]) {
      const cases = emailIds.map(() => 'WHEN ? THEN ?').join(' ');
      counterSql.push(`${column} = ${column} + CASE id ${cases} ELSE 0 END`);
      for (const emailId of emailIds) {
        bindings.push(emailId, incrementsByEmail.get(emailId)[property]);
      }
    }
    await transaction.raw(
      `UPDATE emails SET ${counterSql.join(', ')} WHERE id IN (${emailIds.map(() => '?').join(',')})`,
      [...bindings, ...emailIds],
    );
  }

  async #updateMemberState(transaction, transitions, lastSeenUpdates) {
    const incrementsByMember = new Map();
    for (const transition of transitions) {
      if (transition.openedAt) {
        incrementsByMember.set(
          transition.memberId,
          (incrementsByMember.get(transition.memberId) || 0) + 1,
        );
      }
    }
    if (incrementsByMember.size > 0) {
      const memberIds = Array.from(incrementsByMember.keys());
      const cases = memberIds.map(() => 'WHEN ? THEN ?').join(' ');
      const bindings = memberIds.flatMap((memberId) => [
        memberId,
        incrementsByMember.get(memberId),
      ]);
      await transaction.raw(
        `UPDATE members SET email_opened_count = email_opened_count + CASE id ${cases} ELSE 0 END WHERE id IN (${memberIds.map(() => '?').join(',')})`,
        [...bindings, ...memberIds],
      );
      await transaction('members')
        .whereIn('id', memberIds)
        .update({
          email_open_rate: transaction.raw(
            'CASE WHEN email_tracked_count IS NULL THEN email_open_rate WHEN email_tracked_count >= ? THEN ROUND(email_opened_count * 100.0 / email_tracked_count) ELSE NULL END',
            [5],
          ),
        });
    }

    if (lastSeenUpdates.size > 0) {
      const timezone = this.#settingsCache?.get('timezone') || 'Etc/UTC';
      const memberIds = Array.from(lastSeenUpdates.keys());
      const cases = [];
      const bindings = [];
      for (const memberId of memberIds) {
        const timestamp = lastSeenUpdates.get(memberId);
        const startOfDay = moment
          .utc(timestamp)
          .tz(timezone)
          .startOf('day')
          .utc()
          .format('YYYY-MM-DD HH:mm:ss');
        cases.push(
          'WHEN ? THEN CASE WHEN last_seen_at IS NULL OR last_seen_at < ? THEN ? ELSE last_seen_at END',
        );
        bindings.push(memberId, startOfDay, timestamp);
      }
      await transaction.raw(
        `UPDATE members SET last_seen_at = CASE id ${cases.join(' ')} ELSE last_seen_at END WHERE id IN (${memberIds.map(() => '?').join(',')})`,
        [...bindings, ...memberIds],
      );
    }
  }
}

module.exports = NewsletterEmailEventStorage;
