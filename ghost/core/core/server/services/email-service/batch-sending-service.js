const logging = require('@tryghost/logging');
const ObjectID = require('bson-objectid').default;
const errors = require('@tryghost/errors');
const tpl = require('@tryghost/tpl');
const {
  RECIPIENT_VERIFICATION_CODE,
  recipientVerificationError,
  excludedRecipientError,
  isCount,
  countsDiffer,
  missingRecipientFields,
} = require('./recipient-accounting');
const {
  validatePreparationConcurrency,
  selectedMemberIds,
  resolvePreparationMembers,
  runPreparationWorkers,
  preparationPages,
  waitForPreparationRetry,
} = require('./recipient-preparation');
const messages = {
  emailErrorPartialFailure:
    'An error occurred, and your newsletter was only partially sent. Please retry sending the remaining emails.',
  emailError: 'An unexpected error occurred, please retry sending your newsletter.',
  submissionUncertain: 'We couldn’t confirm whether your newsletter finished sending.',
};

const MAX_SENDING_CONCURRENCY = 2;
const SHUTDOWN_CODE = 'BULK_EMAIL_SHUTDOWN_IN_PROGRESS';
const RECIPIENT_READ_MISMATCH = 'BULK_EMAIL_RECIPIENT_READ_MISMATCH';

/**
 * @typedef {import('./sending-service')} SendingService
 * @typedef {import('./email-segmenter')} EmailSegmenter
 * @typedef {import('./email-renderer')} EmailRenderer
 * @typedef {import('./domain-warming-service').DomainWarmingService} DomainWarmingService
 * @typedef {import('./email-renderer').MemberLike} MemberLike
 * @typedef {object} JobsService
 * @typedef {object} Email
 * @typedef {object} Newsletter
 * @typedef {object} Post
 * @typedef {object} EmailBatch
 */

class BatchSendingService {
  #emailRenderer;
  #sendingService;
  #emailSegmenter;
  #domainWarmingService;
  #jobsService;
  #models;
  #db;
  #sentry;
  #getRequiredUrlRelations;
  #batchCreationConcurrency;
  #shuttingDown = false;
  #inFlight = new Set();

  // Retry database queries happening before sending the email
  #BEFORE_RETRY_CONFIG = { maxRetries: 10, maxTime: 10 * 60 * 1000, sleep: 2000 };
  #AFTER_RETRY_CONFIG = { maxRetries: 20, maxTime: 30 * 60 * 1000, sleep: 2000 };
  #MAILGUN_API_RETRY_CONFIG = { sleep: 10 * 1000, maxRetries: 6 };

  // The normal budgets (up to 30 minutes) outlive the container's grace period, so
  // retrying just holds a batch in `submitting` until the process is killed, turning a
  // recoverable `failed` into an orphan. Give up fast, except on the terminal status
  // write, which has to land.
  #SHUTDOWN_RETRY_CONFIG = { maxRetries: 0 };
  #SHUTDOWN_AFTER_RETRY_CONFIG = { maxRetries: 3, maxTime: 10 * 1000, sleep: 250 };

  /**
   * @param {Object} dependencies
   * @param {EmailRenderer} dependencies.emailRenderer
   * @param {SendingService} dependencies.sendingService
   * @param {JobsService} dependencies.jobsService
   * @param {EmailSegmenter} dependencies.emailSegmenter
   * @param {DomainWarmingService} dependencies.domainWarmingService
   * @param {object} dependencies.models
   * @param {object} dependencies.models.EmailRecipient
   * @param {EmailBatch} dependencies.models.EmailBatch
   * @param {Email} dependencies.models.Email
   * @param {object} dependencies.models.Member
   * @param {object} dependencies.db
   * @param {() => string[]} [dependencies.getRequiredUrlRelations] Post relations the live routes need loaded to generate URLs (lazy routing); defaults to none
   * @param {object} [dependencies.sentry]
   * @param {number} [dependencies.batchCreationConcurrency] Maximum active preparation pages
   * @param {object} [dependencies.BEFORE_RETRY_CONFIG]
   * @param {object} [dependencies.AFTER_RETRY_CONFIG]
   * @param {object} [dependencies.MAILGUN_API_RETRY_CONFIG]
   */
  constructor({
    emailRenderer,
    sendingService,
    jobsService,
    emailSegmenter,
    domainWarmingService,
    models,
    db,
    sentry,
    getRequiredUrlRelations = () => [],
    batchCreationConcurrency = 2,
    BEFORE_RETRY_CONFIG,
    AFTER_RETRY_CONFIG,
    MAILGUN_API_RETRY_CONFIG,
  }) {
    this.#emailRenderer = emailRenderer;
    this.#sendingService = sendingService;
    this.#jobsService = jobsService;
    this.#emailSegmenter = emailSegmenter;
    this.#domainWarmingService = domainWarmingService;
    this.#models = models;
    this.#db = db;
    this.#sentry = sentry;
    this.#getRequiredUrlRelations = getRequiredUrlRelations;
    this.#batchCreationConcurrency = validatePreparationConcurrency(batchCreationConcurrency);

    if (BEFORE_RETRY_CONFIG) {
      this.#BEFORE_RETRY_CONFIG = BEFORE_RETRY_CONFIG;
    } else {
      if (process.env.NODE_ENV.startsWith('test') || process.env.NODE_ENV === 'development') {
        this.#BEFORE_RETRY_CONFIG = { maxRetries: 0 };
      }
    }
    if (AFTER_RETRY_CONFIG) {
      this.#AFTER_RETRY_CONFIG = AFTER_RETRY_CONFIG;
    } else {
      if (process.env.NODE_ENV.startsWith('test') || process.env.NODE_ENV === 'development') {
        this.#AFTER_RETRY_CONFIG = { maxRetries: 0 };
      }
    }

    if (MAILGUN_API_RETRY_CONFIG) {
      this.#MAILGUN_API_RETRY_CONFIG = MAILGUN_API_RETRY_CONFIG;
    } else {
      if (process.env.NODE_ENV.startsWith('test') || process.env.NODE_ENV === 'development') {
        this.#MAILGUN_API_RETRY_CONFIG = { maxRetries: 0 };
      }
    }
  }

  // Each config carries the policy to switch to on shutdown. retryDb applies it per
  // attempt, so a shutdown starting mid-retry collapses the remaining budget too.
  #getBeforeRetryConfig(email) {
    if (email?._retryCutOffTime) {
      return {
        ...this.#BEFORE_RETRY_CONFIG,
        stopAfterDate: email._retryCutOffTime,
        shutdownConfig: this.#SHUTDOWN_RETRY_CONFIG,
      };
    }
    return { ...this.#BEFORE_RETRY_CONFIG, shutdownConfig: this.#SHUTDOWN_RETRY_CONFIG };
  }

  #getAfterRetryConfig() {
    return { ...this.#AFTER_RETRY_CONFIG, shutdownConfig: this.#SHUTDOWN_AFTER_RETRY_CONFIG };
  }

  #getMailgunRetryConfig() {
    return { ...this.#MAILGUN_API_RETRY_CONFIG, shutdownConfig: this.#SHUTDOWN_RETRY_CONFIG };
  }

  /**
   * Normalises retry options for a single attempt: swaps in the shutdown policy once a
   * shutdown has started, then pins the deadline implied by maxTime (shortest wins).
   */
  #resolveRetryOptions(options) {
    let resolved = options;

    if (this.#shuttingDown && resolved.shutdownConfig && !resolved.shutdownPolicyApplied) {
      resolved = {
        ...resolved,
        ...resolved.shutdownConfig,
        shutdownConfig: resolved.shutdownConfig,
        shutdownPolicyApplied: true,
      };
    }

    if (resolved.maxTime !== undefined) {
      const stopAfterDate = new Date(Date.now() + resolved.maxTime);
      if (!resolved.stopAfterDate || stopAfterDate < resolved.stopAfterDate) {
        resolved = { ...resolved, stopAfterDate };
      }
    }

    return resolved;
  }

  /**
   * Signals the batch workers to stop claiming new batches. Runs before the HTTP
   * server drain, so no batch is claimed in a window we can't finish it in.
   * Synchronous — draining is onShutdown's job. Idempotent.
   */
  onPreStop() {
    this.#shuttingDown = true;
  }

  /**
   * Waits for any in-flight sends to finish.
   * Called by the cleanup pipeline when the container is shutting down. Idempotent.
   */
  async onShutdown() {
    this.#shuttingDown = true;
    if (this.#inFlight.size > 0) {
      logging.warn(
        `Email send shutdown: awaiting ${this.#inFlight.size} in-flight sendBatches call(s) to settle`,
      );
    }
    await Promise.allSettled([...this.#inFlight]);
    logging.warn(`Email send shutdown: drain complete`);
  }

  /**
   * Schedules a background job that sends the email in the background if it is pending or failed.
   * @param {Email} email
   * @returns {void}
   */
  scheduleEmail(email) {
    logging.info(`[Background Job] batch-sending-service-job queued for email ${email.id}`);
    return this.#jobsService.addJob({
      name: 'batch-sending-service-job',
      job: this.emailJob.bind(this),
      data: { emailId: email.id },
      offloaded: false,
    });
  }

  /**
   * @private
   * @param {{emailId: string}} data Data passed from the job service. We only need the emailId because we need to refetch the email anyway to make sure the status is right and 'locked'.
   */
  async emailJob({ emailId }) {
    logging.info(`[Background Job] batch-sending-service-job started for email ${emailId}`);

    const startTime = Date.now();

    // Check if email is 'pending' only + change status to submitting in one transaction.
    // This allows us to have a lock around the email job that makes sure an email can only have one active job.
    // Also stamps updated_at, which SendingStatusService reads as the attempt start; do not save the Email once batches submit.
    let email;
    try {
      email = await this.retryDb(
        async () => {
          return await this.updateStatusLock(this.#models.Email, emailId, 'submitting', [
            'pending',
            'failed',
          ]);
        },
        {
          ...this.#getBeforeRetryConfig(),
          description: `updateStatusLock email ${emailId} -> submitting`,
        },
      );
    } catch (err) {
      logging.error(
        err,
        `[Background Job] batch-sending-service-job failed while acquiring the status lock after ${Date.now() - startTime}ms`,
      );
      throw err;
    }
    if (!email) {
      logging.error(
        `[Background Job] batch-sending-service-job skipped because email ${emailId} is not pending or failed`,
      );
      return;
    }

    // We'll stop all automatic DB retries after this date
    const expectedBatchCount = Math.ceil(email.get('email_count') / 1000);
    const minimumSecondsPerBatch = 26; // In case of database issues, we make sure we expand the retry window relative to the amount of batches
    const stopAfter = Math.max(
      expectedBatchCount * minimumSecondsPerBatch * 1000,
      this.#BEFORE_RETRY_CONFIG.maxTime,
    );
    const retryCutOffTime = new Date(startTime + stopAfter);

    // Save a strict cutoff time for retries
    email._retryCutOffTime = retryCutOffTime;

    try {
      const submission = await this.sendEmail(email);
      await this.retryDb(
        async () => {
          await email.save(
            {
              status: 'submitted',
              submitted_at: new Date(),
              error: null,
              ...(submission ? { email_count: submission.submittedCount } : {}),
            },
            { patch: true, autoRefresh: false },
          );
        },
        { ...this.#getAfterRetryConfig(), description: `email ${emailId} -> submitted` },
      );
      logging.info(
        `[Background Job] batch-sending-service-job completed for email ${emailId} in ${Date.now() - startTime}ms`,
      );
    } catch (e) {
      // Any failure while shutting down counts as interrupted, not failed:
      // collapsed budgets surface transient errors as hard failures, and `failed`
      // drops the email out of the boot resume scan.
      if ((e && e.code === SHUTDOWN_CODE) || this.#shuttingDown) {
        if (e?.retryable === false) {
          this.#sentry?.captureException(e);
        }
        logging.info(
          `[Background Job] batch-sending-service-job send stopped because the container is shutting down — leaving email ${email.id} status=submitting so it can resume on next boot`,
        );
        return;
      }
      const ghostError = new errors.EmailError({
        err: e,
        code: 'BULK_EMAIL_SEND_FAILED',
        message: `Error sending email ${email.id}`,
      });

      logging.error(
        ghostError,
        `[Background Job] batch-sending-service-job failed for email ${emailId} after ${Date.now() - startTime}ms`,
      );
      if (this.#sentry) {
        // Log the original error to Sentry
        this.#sentry.captureException(e);
      }

      // Store error and status in email model
      await this.retryDb(
        async () => {
          await email.save(
            {
              status: 'failed',
              error: e.message || 'Something went wrong while sending the email',
            },
            { patch: true, autoRefresh: false },
          );
        },
        { ...this.#getAfterRetryConfig(), description: `email ${emailId} -> failed` },
      );
    }
  }

  /**
   * @private
   * @param {Email} email
   * @throws {errors.EmailError} If one of the batches fails
   */
  async sendEmail(email) {
    // Track the whole operation (batch creation + sending) so onShutdown awaits it
    // before ghost-server schedules process.exit. Covers both creating batches and the
    // Mailgun POST + EmailBatch status write, so neither is killed mid-flight.
    const work = this.#sendEmailInner(email);
    this.#inFlight.add(work);
    try {
      return await work;
    } finally {
      this.#inFlight.delete(work);
    }
  }

  /**
   * @private
   * @param {Email} email
   * @throws {errors.EmailError} If one of the batches fails
   */
  async #sendEmailInner(email) {
    logging.info(`Sending email ${email.id}`);

    // Load required relations
    const newsletter = await this.retryDb(
      async () => {
        return await email.getLazyRelation('newsletter', { require: true });
      },
      {
        ...this.#getBeforeRetryConfig(email),
        description: `getLazyRelation newsletter for email ${email.id}`,
      },
    );

    // 'tiers' is required by the email tier-gating logic (renderer/segmenter), not for URL generation
    const postRelations = [
      ...new Set(['posts_meta', 'authors', 'tiers', ...this.#getRequiredUrlRelations()]),
    ];
    const post = await this.retryDb(
      async () => {
        return await email.getLazyRelation('post', { require: true, withRelated: postRelations });
      },
      {
        ...this.#getBeforeRetryConfig(email),
        description: `getLazyRelation post for email ${email.id}`,
      },
    );

    // Rebuild until prepared_at is saved. Emails with null preflight_email_count
    // whose submission has already started reuse their existing batches instead.
    const batches = await this.createBatches({ email, newsletter, post });
    return await this.sendBatches({ email, batches, post, newsletter });
  }

  /**
   * @private
   * @param {Email} email
   * @returns {Promise<EmailBatch[]>}
   */
  async getBatches(email) {
    logging.info(`Getting batches for email ${email.id}`);

    // findAll returns a bookshelf collection, we want to return a plain array to align with the createBatches method
    const batches = await this.#models.EmailBatch.findAll({
      filter: "email_id:'" + email.id + "'",
    });
    return batches.models;
  }

  /**
   * Rebuild unsent preparation or reuse the frozen recipient set.
   * @private
   * @param {{email: Email, newsletter: Newsletter, post: Post}} data
   * @returns {Promise<EmailBatch[]>}
   */
  async createBatches({ email, post, newsletter }) {
    logging.info(`Creating batches for email ${email.id}`);
    if (this.#isPrepared(email)) {
      return this.#verifyFrozenPreparation(email, this.#getBeforeRetryConfig(email));
    }
    if (!this.#usesRecipientAccounting(email)) {
      const batches = await this.retryDb(() => this.getBatches(email), {
        ...this.#getBeforeRetryConfig(email),
        description: `get legacy batches for email ${email.id}`,
      });
      // For emails with null preflight_email_count, all batch creation finishes
      // before any batch is submitted to the email provider. A non-pending batch
      // therefore means the entire set was prepared; preserve it without inventing counts.
      if (batches.some((batch) => batch.get('status') !== 'pending')) {
        return batches;
      }
      // Persist opt-in before rebuilding so an interrupted conversion resumes
      // through the same protocol as a newly created email.
      await this.retryDb(
        () =>
          email.save(
            { preflight_email_count: email.get('email_count') },
            {
              patch: true,
              require: false,
              autoRefresh: false,
            },
          ),
        {
          ...this.#getBeforeRetryConfig(email),
          description: `enable recipient accounting for email ${email.id}`,
        },
      );
    }
    return this.#rebuildPreparation({ email, post, newsletter });
  }

  async #rebuildPreparation({ email, post, newsletter }) {
    const attemptId = ObjectID().toHexString();
    const startedAt = Date.now();
    await this.#startPreparation(email, attemptId);
    const counts = await this.#sweepPreparationSegments({ email, post, newsletter, attemptId });
    this.#checkPreparationActive();
    const batches = await this.#completePreparation(email, { ...counts, attemptId });
    logging.info(
      {
        event: { name: 'email.batches.created' },
        email_id: email.id,
        attempt_id: attemptId,
        duration_ms: Date.now() - startedAt,
        batches_total: batches.length,
        email_count: email.get('email_count'),
        candidate_count: counts.candidateCount,
        preparation_excluded_count: counts.excludedCount,
        concurrency: this.#batchCreationConcurrency,
        recipient_filter: email.get('recipient_filter'),
      },
      'Created newsletter batches',
    );
    return batches;
  }

  #checkPreparationActive(signal) {
    signal?.throwIfAborted();
    if (this.#shuttingDown) {
      throw new errors.InternalServerError({
        code: SHUTDOWN_CODE,
        message: 'Email batch creation stopped because the container is shutting down',
      });
    }
  }

  async #sweepPreparationSegments({ email, post, newsletter, attemptId }) {
    const segments = await this.#emailRenderer.getSegments(post);
    const batchSize = this.#sendingService.getMaximumRecipients();
    const warmupLimit = this.#getDomainWarmupLimit(email);
    let candidateCount = 0;
    let excludedCount = 0;
    for (const segment of segments) {
      const segmentFilter = this.#emailSegmenter.getMemberFilterForSegment(
        newsletter,
        email.get('recipient_filter'),
        segment,
      );
      const startedAt = Date.now();
      const ids = await this.retryDb(
        async () => {
          this.#checkPreparationActive();
          // Each segment reads current filter attributes; the ID cutoff only excludes newer members.
          // Counts cover this attempt's selected IDs, not one snapshot shared by all segments.
          const rows = await this.#models.Member.getFilteredCollectionQuery({
            filter: segmentFilter + `+id:<'${email.id}'`,
          })
            .orderByRaw('members.id DESC')
            .select('members.id');
          return selectedMemberIds(rows);
        },
        {
          ...this.#getBeforeRetryConfig(email),
          description: `sweep audience for email ${email.id} segment ${segment}`,
        },
      );
      this.#checkPreparationActive();
      logging.info(
        {
          event: { name: 'email.preparation.swept' },
          email_id: email.id,
          attempt_id: attemptId,
          segment,
          candidate_count: ids.length,
          duration_ms: Date.now() - startedAt,
        },
        'Selected newsletter candidate recipients',
      );
      const remainingCapacity = warmupLimit - candidateCount;
      candidateCount += ids.length;
      if (ids.length === 0) {
        continue;
      }
      await runPreparationWorkers(
        preparationPages(ids, batchSize, remainingCapacity),
        // Warming can introduce one additional partial page.
        Math.min(this.#batchCreationConcurrency, Math.ceil(ids.length / batchSize) + 1),
        () => this.#checkPreparationActive(),
        async (page, signal) => {
          const pageExcludedCount = await this.#prepareSweptPage(
            {
              email,
              segment,
              attemptId,
              page,
            },
            signal,
          );
          // Read the aggregate only after awaiting: compound assignment across
          // an await would overwrite another worker's completed exclusions.
          excludedCount += pageExcludedCount;
        },
      );
    }
    return { candidateCount, excludedCount };
  }

  async #prepareSweptPage({ email, segment, attemptId, page }, signal) {
    const rows = await this.retryDb(
      () => {
        this.#checkPreparationActive(signal);
        return resolvePreparationMembers(this.#db.knex, page.ids);
      },
      {
        ...this.#getBeforeRetryConfig(email),
        signal,
        description: `resolve members for email ${email.id} segment ${segment} page ${page.offset}`,
      },
    );
    this.#checkPreparationActive(signal);
    const byId = new Map(rows.map((row) => [row.id, row]));
    // Retain missing IDs so the page's exclusion count includes them.
    const candidates = page.ids.map((id) => {
      const member = byId.get(id);
      if (!member) {
        logging.info(
          {
            event: { name: 'email.preparation.excluded' },
            email_id: email.id,
            attempt_id: attemptId,
            member_id: id,
            reason: 'member_not_found',
          },
          'Member no longer found during newsletter preparation',
        );
      }
      return member ?? { id, missing: true };
    });
    return this.#preparePage({
      email,
      segment,
      members: candidates,
      attemptId,
      useFallbackDomain: page.useFallbackDomain,
      signal,
    });
  }

  async #verifyFrozenPreparation(email, retryOptions) {
    const verified = await this.retryDb(
      () =>
        this.#verifyPreparedRecipients(
          email,
          email.get('candidate_count'),
          email.get('preparation_excluded_count'),
        ),
      {
        ...retryOptions,
        description: `verify frozen preparation for email ${email.id}`,
      },
    );
    this.#verifyStoredEmailCount(email, verified);
    return verified.batches;
  }

  #verifyStoredEmailCount(email, { batches, recipientCount }) {
    const actual = email.get('email_count');
    if (actual === recipientCount) {
      return;
    }
    // Preparation stores intent; completion replaces it with successful
    // submissions. Accept that smaller total only when every batch has verified
    // submission counts. Partially sent and preparation-only sends retain intent.
    const submission = this.#verifySubmissionCounts(email, batches);
    if (submission && actual === submission.submittedCount) {
      return;
    }
    const expected = submission?.submittedCount ?? recipientCount;
    throw this.#verificationFailure(
      email,
      'email_recipient_count',
      { expected, actual },
      countsDiffer(expected, actual),
    );
  }

  async #startPreparation(email, attemptId) {
    await this.retryDb(() => this.#discardIncompletePreparation(email), {
      ...this.#getBeforeRetryConfig(email),
      description: `discard incomplete preparation for email ${email.id}`,
    });
    logging.info(
      {
        event: { name: 'email.preparation.started' },
        email_id: email.id,
        attempt_id: attemptId,
        concurrency: this.#batchCreationConcurrency,
      },
      'Starting email preparation',
    );
  }

  #getDomainWarmupLimit(email) {
    // Infinity implies all emails should be sent from the primary domain.
    if (this.#domainWarmingService.isEnabled() && Number.isInteger(email.get('csd_email_count'))) {
      return email.get('csd_email_count');
    }
    return Infinity;
  }

  async #preparePage({ email, segment, members, attemptId, useFallbackDomain, signal }) {
    this.#checkPreparationActive(signal);
    const snapshot = this.#snapshotPreparationMembers(
      email,
      members.filter((member) => !member.missing),
      attemptId,
    );
    if (snapshot.length > 0) {
      await this.#createBatchWithRecovery(
        email,
        { segment, members: snapshot, useFallbackDomain },
        attemptId,
        signal,
      );
    }
    return members.length - snapshot.length;
  }

  async #completePreparation(email, { candidateCount, excludedCount, attemptId }) {
    const verified = await this.retryDb(
      () => this.#verifyPreparedRecipients(email, candidateCount, excludedCount),
      {
        ...this.#getBeforeRetryConfig(email),
        description: `verify preparation for email ${email.id}`,
      },
    );
    const preparation = {
      candidate_count: candidateCount,
      preparation_excluded_count: excludedCount,
      email_count: verified.recipientCount,
      prepared_at: new Date(),
    };
    this.#checkPreparationActive();
    await this.retryDb(
      () => email.save(preparation, { patch: true, require: false, autoRefresh: false }),
      {
        ...this.#getBeforeRetryConfig(email),
        description: `save preparation boundary for email ${email.id}`,
      },
    );
    logging.info(
      {
        event: { name: 'email.preparation.completed' },
        email_id: email.id,
        attempt_id: attemptId,
        preflight_email_count: email.get('preflight_email_count'),
        ...preparation,
      },
      'Verified email preparation',
    );
    this.#reportAudienceDrift(email, candidateCount);
    return verified.batches;
  }

  #reportAudienceDrift(email, candidateCount) {
    const preflightCount = email.get('preflight_email_count');
    const drift = Math.abs(candidateCount - preflightCount);
    if (drift > 0 && (preflightCount === 0 || drift / preflightCount >= 0.01)) {
      logging.warn(
        {
          event: { name: 'email.preparation.audience_drift' },
          email_id: email.id,
          preflight_email_count: preflightCount,
          candidate_count: candidateCount,
        },
        'Newsletter candidate audience differs from the preflight estimate',
      );
      this.#sentry?.captureMessage(
        `Email ${email.id} candidate count ${candidateCount} differs from preflight count ${preflightCount}.`,
      );
    }
  }

  #isPrepared(email) {
    return (email.get('prepared_at') ?? null) !== null;
  }

  #usesRecipientAccounting(email) {
    return (email.get('preflight_email_count') ?? null) !== null;
  }

  #verificationFailure(email, reason, details = {}, countMismatch = false) {
    const canRebuild =
      !this.#isPrepared(email) &&
      ['batch_recipient_count', 'preparation_totals', 'batch_recovery_conflict'].includes(reason);
    // emailJob reports the terminal integrity failure to Sentry once.
    return recipientVerificationError(email.id, reason, details, { canRebuild, countMismatch });
  }

  #assertAllPending(email, batches) {
    const started = batches.find((batch) => batch.get('status') !== 'pending');
    if (started) {
      throw this.#verificationFailure(email, 'incomplete_preparation_already_submitting', {
        batch_id: started.id,
      });
    }
  }

  async #discardIncompletePreparation(email) {
    const batches = await this.getBatches(email);
    this.#assertAllPending(email, batches);
    await this.#verifyRecipientOwnership(email);
    // Awaited preparation writes have settled before cleanup. Delete recipients
    // before batches, in bounded chunks that can restart after interruption.
    await this.#deletePreparationRows(email, 'email_recipients');
    await this.#deletePreparationRows(email, 'email_batches');
    if (batches.length > 0) {
      logging.info(
        {
          event: { name: 'email.preparation.discarded' },
          email_id: email.id,
          batch_count: batches.length,
        },
        'Discarded incomplete email preparation',
      );
    }
  }

  async #verifyRecipientOwnership(email) {
    const foreignRecipient = await this.#findForeignRecipient(email.id);
    if (foreignRecipient) {
      throw this.#verificationFailure(email, 'cross_email_recipient', {
        batch_id: foreignRecipient.batch_id,
      });
    }
  }

  async #findForeignRecipient(emailId) {
    const recipients = this.#db
      .knex('email_recipients as recipient')
      .join('email_batches as batch', 'batch.id', 'recipient.batch_id');
    // Separate owner predicates allow each probe to use its email index. Both
    // directions must be checked, even when this email has no batches of its own.
    const foreignInOwnBatch = await recipients
      .clone()
      .where('batch.email_id', emailId)
      .whereNot('recipient.email_id', emailId)
      .first('recipient.batch_id');
    if (foreignInOwnBatch) {
      return foreignInOwnBatch;
    }
    const ownInForeignBatch = await recipients
      .clone()
      .where('recipient.email_id', emailId)
      .whereNot('batch.email_id', emailId)
      .first('recipient.batch_id');
    return ownInForeignBatch;
  }

  async #deletePreparationRows(email, table) {
    while (true) {
      if (this.#shuttingDown) {
        throw new errors.InternalServerError({
          code: SHUTDOWN_CODE,
          message: 'Email preparation cleanup stopped because the container is shutting down',
        });
      }
      const rows = await this.#db
        .knex(table)
        .where({ email_id: email.id })
        .select('id')
        .limit(1000);
      if (rows.length === 0) {
        break;
      }
      await this.#db
        .knex(table)
        .where({ email_id: email.id })
        .whereIn(
          'id',
          rows.map((row) => row.id),
        )
        .del();
    }
  }

  async #verifyPreparedRecipients(email, candidateCount, excludedCount) {
    const batches = await this.getBatches(email);
    this.#verifyPreparationBoundary(email, batches);
    await this.#verifyRecipientOwnership(email);
    const { counts, actualCount } = await this.#readPreparationCounts(email);
    const recipientCount = this.#verifyBatchRecipientCounts(email, batches, counts);
    this.#verifyPreparationTotals(email, {
      candidateCount,
      excludedCount,
      recipientCount,
      actualCount,
    });
    return { batches, recipientCount };
  }

  #verifyPreparationBoundary(email, batches) {
    if (!this.#isPrepared(email)) {
      this.#assertAllPending(email, batches);
      return;
    }
    // Timestamps have second precision: this detects later seconds, not exact membership.
    // The email job lock and frozen-preparation path prevent new batches after preparation.
    const laterBatch = batches.find(
      (batch) => new Date(batch.get('created_at')) > new Date(email.get('prepared_at')),
    );
    if (laterBatch) {
      throw this.#verificationFailure(email, 'batch_after_preparation', {
        batch_id: laterBatch.id,
      });
    }
  }

  async #readPreparationCounts(email) {
    const rows = await this.#db
      .knex('email_recipients as recipient')
      .join('email_batches as batch', 'recipient.batch_id', 'batch.id')
      .where('batch.email_id', email.id)
      .groupBy('recipient.batch_id')
      .select('recipient.batch_id')
      .count('recipient.id as count');
    const counts = new Map(rows.map((row) => [row.batch_id, Number(row.count)]));
    // Count email-owned rows independently of batch membership so orphaned rows
    // or an inconsistent read cannot disappear from the email-wide check.
    const total = await this.#db
      .knex('email_recipients')
      .where({ email_id: email.id })
      .count('* as count')
      .first();
    const actualCount = Number(total.count);
    return { counts, actualCount };
  }

  #verifyBatchRecipientCounts(email, batches, counts) {
    let recipientCount = 0;
    for (const batch of batches) {
      const expected = batch.get('recipient_count');
      const actual = counts.get(batch.id) ?? 0;
      if (!isCount(expected) || expected === 0 || expected !== actual) {
        throw this.#verificationFailure(
          email,
          'batch_recipient_count',
          {
            batch_id: batch.id,
            expected,
            actual,
          },
          countsDiffer(expected, actual),
        );
      }
      recipientCount += expected;
    }
    return recipientCount;
  }

  #verifyPreparationTotals(email, { candidateCount, excludedCount, recipientCount, actualCount }) {
    const accountedCount = isCount(excludedCount) ? recipientCount + excludedCount : null;
    const validCandidates = isCount(candidateCount) && isCount(excludedCount);
    const candidateMismatch = validCandidates && countsDiffer(candidateCount, accountedCount);
    const candidateCheckFailed = !validCandidates || candidateCount !== accountedCount;
    const rowsCheckFailed = recipientCount !== actualCount;
    if (!candidateCheckFailed && !rowsCheckFailed) {
      return;
    }
    throw this.#verificationFailure(
      email,
      'preparation_totals',
      {
        count_check: candidateCheckFailed ? 'candidate_total' : 'recipient_rows',
        expected: candidateCheckFailed ? candidateCount : recipientCount,
        actual: candidateCheckFailed ? accountedCount : actualCount,
        candidate_count: candidateCount,
        preparation_excluded_count: excludedCount,
        recipient_count: recipientCount,
        actual_count: actualCount,
      },
      candidateCheckFailed ? candidateMismatch : countsDiffer(recipientCount, actualCount),
    );
  }

  async #createBatchWithRecovery(
    email,
    { segment, members, useFallbackDomain },
    attemptId,
    signal,
  ) {
    // Retain this operation's identity and recipient snapshot across its database retries.
    // Restarting preparation reselects the audience until prepared_at freezes membership.
    const operation = {
      email,
      segment,
      members,
      useFallbackDomain,
      batchId: ObjectID().toHexString(),
      attemptId,
    };
    const batch = await this.retryDb(() => this.#createOrRecoverBatch(operation), {
      ...this.#getBeforeRetryConfig(email),
      signal,
      description: `createBatch email ${email.id} segment ${segment}${useFallbackDomain ? ' (fallback domain)' : ' (custom domain)'}`,
    });
    logging.info(
      {
        event: { name: 'email.batch.prepared' },
        email_id: email.id,
        attempt_id: attemptId,
        batch_id: batch.id,
        recipient_count: members.length,
      },
      'Prepared email batch',
    );
    return batch;
  }

  #snapshotPreparationMembers(email, members, attemptId) {
    const snapshot = [];
    for (const member of members) {
      const missing = missingRecipientFields(member);
      if (missing.length > 0) {
        this.#excludePreparationMember(email, attemptId, member, missing);
        continue;
      }
      const { id, uuid, email: address, name } = member;
      snapshot.push({ id, uuid, email: address, name });
    }
    return snapshot;
  }

  #excludePreparationMember(email, attemptId, member, missing) {
    const error = excludedRecipientError(email.id, 'email.preparation.excluded', 'missing_fields', {
      attempt_id: attemptId,
      member_id: member.id,
      missing_fields: missing,
    });
    this.#sentry?.captureException(error);
  }

  async #createOrRecoverBatch(operation) {
    const { email, segment, members, useFallbackDomain, batchId } = operation;
    try {
      return await this.createBatch(email, segment, members, {
        useFallbackDomain,
        batchId,
        recipientCount: members.length,
      });
    } catch (error) {
      return this.#recoverCommittedBatch(operation, error);
    }
  }

  async #recoverCommittedBatch(operation, error) {
    const { email, batchId, attemptId } = operation;
    logging.info(
      {
        err: error,
        event: { name: 'email.batch.recovery.started' },
        email_id: email.id,
        attempt_id: attemptId,
        batch_id: batchId,
      },
      'Checking the outcome of email batch creation',
    );
    // The transaction handler has settled (including its rollback) before
    // this read. A failed acknowledgement does not prove a failed commit.
    const committed = await this.#models.EmailBatch.findOne({ id: batchId });
    if (!committed) {
      throw error;
    }
    const recipients = await this.#db.knex('email_recipients').where({ batch_id: batchId });
    this.#verifyRecoveredBatch(operation, committed, recipients);
    logging.info(
      {
        event: { name: 'email.batch.recovered' },
        email_id: email.id,
        attempt_id: attemptId,
        batch_id: batchId,
      },
      'Recovered committed email batch',
    );
    return committed;
  }

  #verifyRecoveredBatch(
    { email, batchId, segment, members, useFallbackDomain },
    committed,
    recipients,
  ) {
    const identities = recipients
      .map((row) =>
        JSON.stringify([
          row.email_id,
          row.member_id,
          row.member_uuid,
          row.member_email,
          row.member_name ?? null,
        ]),
      )
      .sort();
    const intended = members
      .map((member) =>
        JSON.stringify([email.id, member.id, member.uuid, member.email, member.name ?? null]),
      )
      .sort();
    if (
      committed.get('email_id') !== email.id ||
      (committed.get('member_segment') ?? null) !== (segment ?? null) ||
      Boolean(committed.get('fallback_sending_domain')) !== Boolean(useFallbackDomain) ||
      committed.get('recipient_count') !== members.length ||
      JSON.stringify(identities) !== JSON.stringify(intended)
    ) {
      throw this.#verificationFailure(
        email,
        'batch_recovery_conflict',
        {
          batch_id: batchId,
          expected: members.length,
          actual: recipients.length,
        },
        countsDiffer(members.length, recipients.length),
      );
    }
  }

  /**
   * @private
   * @param {Email} email
   * @param {import('./email-renderer').Segment} segment
   * @param {object[]} members
   * @param {object} options
   * @param {boolean} options.useFallbackDomain
   * @param {string} [options.batchId] Stable operation identity for accounted preparation
   * @param {number} [options.recipientCount] Expected size of the accounted recipient snapshot
   * @param {import('knex').Knex} [options.transacting]
   * @returns {Promise<EmailBatch>}
   */
  async createBatch(email, segment, members, options) {
    if (!options || !options.transacting) {
      return this.#models.EmailBatch.transaction(async (transacting) => {
        return this.createBatch(email, segment, members, { transacting, ...options });
      });
    }

    logging.info(
      `Creating batch for email ${email.id} segment ${segment} with ${members.length} members`,
    );

    const recipientData = [];

    // Keep this safety net for all callers; accounted omissions are caught by
    // #verifyBatchRecipientCounts against the original snapshot size.
    members.forEach((memberRow) => {
      if (missingRecipientFields(memberRow).length > 0) {
        logging.warn(
          `Member row not included as email recipient due to missing data - id: ${memberRow.id}, uuid: ${memberRow.uuid}, email: ${memberRow.email}`,
        );
        return;
      }

      recipientData.push({
        id: ObjectID().toHexString(),
        email_id: email.id,
        member_id: memberRow.id,
        member_uuid: memberRow.uuid,
        member_email: memberRow.email,
        member_name: memberRow.name,
      });
    });

    const batch = await this.#models.EmailBatch.add(
      {
        ...(options.batchId ? { id: options.batchId } : {}),
        email_id: email.id,
        member_segment: segment,
        status: 'pending',
        fallback_sending_domain: Boolean(options.useFallbackDomain),
        ...(options.recipientCount !== undefined
          ? { recipient_count: options.recipientCount }
          : {}),
      },
      options,
    );

    for (const recipient of recipientData) {
      recipient.batch_id = batch.id;
    }

    const insertQuery = this.#db.knex('email_recipients').insert(recipientData);

    if (options.transacting) {
      insertQuery.transacting(options.transacting);
    }

    logging.info(
      `Inserting ${recipientData.length} recipients for email ${email.id} batch ${batch.id}`,
    );
    await insertQuery;
    return batch;
  }

  async sendBatches({ email, batches, post, newsletter }) {
    logging.info(`Sending ${batches.length} batches for email ${email.id}`);
    const deadline = this.getDeliveryDeadline(email);

    if (deadline) {
      logging.info(`Delivery deadline for email ${email.id} is ${deadline}`);
    }
    // Reuse same HTML body if we send an email to the same segment
    /** @type {Map<string, import('./email-renderer').EmailBody>} */
    const emailBodyCache = new Map();

    // Spread batches across the target window if one is configured. `deliveryTimes`
    // handles the past-deadline case internally (resume of an interrupted send or a
    // delayed job): if the original `created_at + targetDeliveryWindow` deadline has
    // passed, the function respreads remaining batches over a fresh window starting
    // now instead of returning undefined for every batch (which would dump every
    // remaining batch into Mailgun in the same second and break the rate-spread).
    const targetDeliveryWindow = this.#sendingService.getTargetDeliveryWindow();
    const shouldApplyDeliveryTimes = targetDeliveryWindow !== undefined && targetDeliveryWindow > 0;
    const deliveryTimes = this.calculateDeliveryTimes(email, batches.length);

    // Loop batches and send them via the EmailProvider
    // SendingStatusService treats a batch that fails in this run as finished work; never re-queue it within the run.
    let succeededCount = 0;
    const queue = batches.slice();

    const runWorker = async () => {
      while (!this.#shuttingDown) {
        const batch = queue.shift();
        if (!batch) {
          return;
        }
        const batchData = {
          email,
          batch,
          post,
          newsletter,
          emailBodyCache,
          deliveryTime: undefined,
        };
        if (shouldApplyDeliveryTimes) {
          const deliveryTime = deliveryTimes.shift();
          if (deliveryTime && deliveryTime >= Date.now()) {
            batchData.deliveryTime = deliveryTime;
          }
        }
        if (await this.sendBatch(batchData)) {
          succeededCount += 1;
        }
      }
    };

    // Run maximum MAX_SENDING_CONCURRENCY at the same time.
    // allSettled so one worker throwing doesn't detach the others: the drain must not
    // resolve while a sibling's terminal status write is still in flight.
    const workerResults = await Promise.allSettled(
      new Array(MAX_SENDING_CONCURRENCY).fill(0).map(() => runWorker()),
    );

    logging.info(
      `Email ${email.id} send done: ${succeededCount}/${batches.length} batches succeeded, ${queue.length} unstarted`,
    );

    // Preserve an integrity failure even if its status write failed. Another
    // worker's database error or shutdown must not replace the original cause.
    const failedWorkers = workerResults.filter((result) => result.status === 'rejected');
    const failedWorker =
      failedWorkers.find((result) => result.reason?.retryable === false) ?? failedWorkers[0];
    if (failedWorker) {
      await this.#rethrowWorkerFailure(email, failedWorker.reason);
    }

    if (this.#shuttingDown && queue.length > 0) {
      if (this.#usesRecipientAccounting(email)) {
        // A worker may have persisted an integrity failure while shutdown left
        // other batches unstarted. Check the small batch rows before interrupting
        // so emailJob still reports it; do not rescan recipients during the drain.
        await this.#verifyPersistedSubmissionCounts(email);
      }
      throw new errors.InternalServerError({
        code: SHUTDOWN_CODE,
        message: 'Email send stopped because the container is shutting down',
      });
    }

    if (this.#usesRecipientAccounting(email)) {
      return this.#verifySubmittedBatches(email);
    }
    this.#assertSubmissionComplete(succeededCount, batches.length);
  }

  async #verifyPersistedSubmissionCounts(email) {
    return this.retryDb(
      async () => this.#verifySubmissionCounts(email, await this.getBatches(email)),
      {
        ...this.#getAfterRetryConfig(),
        description: `verify persisted submission counts for email ${email.id}`,
      },
    );
  }

  async #rethrowWorkerFailure(email, workerError) {
    if (this.#usesRecipientAccounting(email)) {
      try {
        // A later processed_at write can fail after an integrity failure was saved.
        // Prefer that recorded failure without rescanning the recipient table.
        await this.#verifyPersistedSubmissionCounts(email);
      } catch (error) {
        if (error.retryable === false) {
          throw error;
        }
        // The lookup can also fail; retain the original worker error in that case.
      }
    }
    throw workerError;
  }

  async #verifySubmittedBatches(email) {
    const batches = await this.#verifyFrozenPreparation(email, this.#getAfterRetryConfig());
    const submission = this.#verifySubmissionCounts(email, batches);
    if (batches.some((batch) => batch.get('status') === 'submitting')) {
      throw new errors.EmailError({
        code: 'BULK_EMAIL_SUBMISSION_UNCERTAIN',
        message: tpl(messages.submissionUncertain),
      });
    }
    this.#assertSubmissionComplete(
      batches.filter((batch) => batch.get('status') === 'submitted').length,
      batches.length,
      // Completed batches may contain only exclusions, not successful submissions.
      messages.emailError,
    );
    this.#reportSubmission(email, batches, submission);
    return submission;
  }

  #reportSubmission(email, batches, submission) {
    if (submission) {
      logging.info(
        {
          event: { name: 'email.submission.verified' },
          email_id: email.id,
          candidate_count: email.get('candidate_count'),
          preparation_excluded_count: email.get('preparation_excluded_count'),
          submitted_count: submission.submittedCount,
          submission_excluded_count: submission.submissionExcludedCount,
        },
        'Email recipient submission verified',
      );
      return;
    }
    logging.info(
      {
        event: { name: 'email.submission.unverified' },
        email_id: email.id,
        batch_count: batches.length,
        reason: 'submission_counts_unavailable',
        unverified_batch_ids: batches
          .filter(
            (batch) =>
              batch.get('submitted_count') === null &&
              batch.get('submission_excluded_count') === null,
          )
          .map((batch) => batch.id),
      },
      'All email batches submitted; submission recipient counts are unavailable',
    );
  }

  #assertSubmissionComplete(succeededCount, expectedBatchCount, failureMessage) {
    if (succeededCount < expectedBatchCount) {
      throw new errors.EmailError({
        message: tpl(
          failureMessage ??
            (succeededCount > 0 ? messages.emailErrorPartialFailure : messages.emailError),
        ),
      });
    }
  }

  #throwPersistedVerificationFailure(email, batch) {
    let errorData;
    try {
      errorData = JSON.parse(batch.get('error_data') ?? 'null');
    } catch {
      // Ordinary provider failures can contain non-JSON diagnostics.
    }
    if (batch.get('status') === 'failed' && errorData?.code === RECIPIENT_VERIFICATION_CODE) {
      throw this.#verificationFailure(
        email,
        'batch_verification_failed',
        {
          batch_id: batch.id,
          batch_error: errorData,
          expected: errorData.expected,
          actual: errorData.actual,
          count_check: errorData.count_check,
        },
        errorData.count_mismatch === true,
      );
    }
  }

  #verifySubmissionCounts(email, batches) {
    let submittedCount = 0;
    let submissionExcludedCount = 0;
    let unknown = false;
    for (const batch of batches) {
      this.#throwPersistedVerificationFailure(email, batch);
      if (batch.get('status') !== 'submitted') {
        unknown = true;
        continue;
      }
      const submitted = batch.get('submitted_count');
      const excluded = batch.get('submission_excluded_count');
      if (submitted === null && excluded === null) {
        // Preparation-only deployments recorded intent but no provider counts.
        unknown = true;
        continue;
      }
      const expected = batch.get('recipient_count');
      const actual = isCount(submitted) && isCount(excluded) ? submitted + excluded : null;
      if (actual === null || expected !== actual) {
        throw this.#verificationFailure(
          email,
          'batch_submission_counts',
          {
            batch_id: batch.id,
            recipient_count: batch.get('recipient_count'),
            expected,
            actual,
            submitted_count: submitted,
            submission_excluded_count: excluded,
          },
          countsDiffer(expected, actual),
        );
      }
      submittedCount += submitted;
      submissionExcludedCount += excluded;
    }
    if (unknown) {
      return;
    }
    // Before completion, preparation verification has already balanced candidates
    // against these same batches. The per-batch identities above therefore also
    // balance the email-wide submission and exclusion totals.
    return { submittedCount, submissionExcludedCount };
  }

  /**
   *
   * @param {{email: Email, batch: EmailBatch, post: Post, newsletter: Newsletter, emailBodyCache: Map<string, import('./email-renderer').EmailBody>, deliveryTime:(Date|undefined) }} data
   * @returns {Promise<boolean>} True when succeeded, false when failed with an error
   */
  async sendBatch({ email, batch: originalBatch, post, newsletter, emailBodyCache, deliveryTime }) {
    logging.info(`Sending batch ${originalBatch.id} for email ${email.id}`);
    const batch = await this.#lockBatch(email, originalBatch.id);
    if (!batch) {
      return this.#reportUnclaimedBatch(originalBatch);
    }
    let succeeded = false;
    try {
      const members = await this.#loadBatchRecipients(email, batch);
      const response = await this.#submitBatchMessage(email, batch, members, {
        post,
        newsletter,
        emailBodyCache,
        deliveryTime,
      });
      succeeded = true;
      await this.#saveBatchStatus(batch, 'submitted', {
        mailgun_message_id: response.id,
        ...(this.#usesRecipientAccounting(email)
          ? {
              submitted_count: response.submittedCount,
              submission_excluded_count: response.submissionExcludedCount,
            }
          : {}),
        error_status_code: null,
        error_message: null,
        error_data: null,
      });
      this.#reportBatchSubmission(email, batch, response);
    } catch (err) {
      this.#reportBatchError(batch, err);
      if (!succeeded) {
        await this.#saveBatchFailure(batch, err);
      } else if (this.#shuttingDown) {
        // Accepted, but the submitted write failed. Keep the email resumable;
        // never replace this uncertain outcome with a failed batch status.
        throw err;
      }
    }
    // Mark as processed even when submission failed.
    await this.#markBatchProcessed(batch);
    return succeeded;
  }

  async #lockBatch(email, batchId) {
    return this.retryDb(
      () =>
        this.updateStatusLock(this.#models.EmailBatch, batchId, 'submitting', [
          'pending',
          'failed',
        ]),
      {
        ...this.#getBeforeRetryConfig(email),
        description: `updateStatusLock batch ${batchId} -> submitting`,
      },
    );
  }

  #reportUnclaimedBatch(batch) {
    const currentStatus = batch.get('status');
    if (currentStatus === 'submitted') {
      // A prior run submitted this batch; include it in the parent's success count.
      logging.info(`Email batch ${batch.id} already submitted on a prior run; skipping`);
      return true;
    }
    // An orphaned submitting batch has no recorded outcome. Preserve the existing
    // reconciliation path instead of claiming success or resubmitting it here.
    logging.error(
      `Email batch ${batch.id} is stuck in status=${currentStatus} (orphan from a crashed worker); not re-sending — marking parent email as failed for operator review`,
    );
    return false;
  }

  async #loadBatchRecipients(email, batch) {
    const recipientAccounting = this.#usesRecipientAccounting(email);
    const expectedCount = batch.get('recipient_count');
    if (recipientAccounting && (!isCount(expectedCount) || expectedCount === 0)) {
      throw this.#verificationFailure(email, 'invalid_batch_recipient_count', {
        batch_id: batch.id,
        expected: expectedCount,
      });
    }
    return this.retryDb(
      async () => {
        const members = recipientAccounting
          ? await this.getBatchMembers(batch.id, expectedCount)
          : await this.getBatchMembers(batch.id);
        // Emails with null preflight_email_count have no verified expected count;
        // retain their empty-read retry after a database switch.
        if (members.length === 0) {
          throw new errors.EmailError({
            message: `No members found for batch ${batch.id}, possible replication lag`,
          });
        }
        return members;
      },
      {
        ...this.#getBeforeRetryConfig(email),
        description: `getBatchMembers batch ${batch.id}`,
      },
    ).catch((error) => {
      if (error.code !== RECIPIENT_READ_MISMATCH) {
        throw error;
      }
      const details = JSON.parse(error.errorDetails);
      throw this.#verificationFailure(
        email,
        'batch_recipient_read',
        { batch_id: batch.id, ...details },
        countsDiffer(details.expected, details.actual),
      );
    });
  }

  async #submitBatchMessage(
    email,
    batch,
    members,
    { post, newsletter, deliveryTime, emailBodyCache },
  ) {
    const recipientAccounting = this.#usesRecipientAccounting(email);
    const data = {
      emailId: email.id,
      post,
      newsletter,
      segment: batch.get('member_segment'),
      members,
    };
    const options = {
      openTrackingEnabled: !!email.get('track_opens'),
      clickTrackingEnabled: !!email.get('track_clicks'),
      useFallbackAddress: batch.get('fallback_sending_domain'),
      deliveryTime,
      emailBodyCache,
      ...(recipientAccounting ? { recipientAccounting: true, batchId: batch.id } : {}),
    };
    // With preflight_email_count set, build the payload once before provider retries.
    // When it is null, each retry still renders and submits together through send().
    let submit = () => this.#sendingService.send(data, options);
    if (recipientAccounting) {
      const message = await this.retryDb(() => this.#sendingService.buildMessage(data, options), {
        ...this.#getBeforeRetryConfig(email),
        description: `Constructing email batch ${batch.id}`,
      });
      submit = () => this.#sendingService.sendMessage(message);
    }
    return this.retryDb(submit, {
      ...this.#getMailgunRetryConfig(),
      description: `Sending email batch ${batch.id} ${deliveryTime ? `with delivery time ${deliveryTime}` : ''}`,
    });
  }

  async #saveBatchStatus(batch, status, attributes) {
    await this.retryDb(
      () =>
        batch.save({ status, ...attributes }, { patch: true, require: false, autoRefresh: false }),
      {
        ...this.#getAfterRetryConfig(),
        description: `save batch ${batch.id} -> ${status}`,
      },
    );
  }

  async #saveBatchFailure(batch, error) {
    try {
      await this.#saveBatchStatus(batch, 'failed', {
        error_status_code: error.statusCode ?? null,
        error_message: error.message,
        error_data: error.errorDetails ?? null,
      });
    } catch (saveError) {
      // The persisted-state lookup cannot recover metadata that was never saved.
      // Keep the raw integrity error for the email banner and Sentry, including on shutdown.
      if (error.retryable === false) {
        throw error;
      }
      throw saveError;
    }
  }

  #reportBatchSubmission(email, batch, response) {
    if (!this.#usesRecipientAccounting(email)) {
      return;
    }
    logging.info(
      {
        event: { name: 'email.batch.submitted' },
        email_id: email.id,
        batch_id: batch.id,
        recipient_count: batch.get('recipient_count'),
        submitted_count: response.submittedCount,
        submission_excluded_count: response.submissionExcludedCount,
        mailgun_message_id: response.id,
      },
      'Email batch submission accounted',
    );
  }

  #reportBatchError(batch, err) {
    const loggedError =
      err.code === 'BULK_EMAIL_SEND_FAILED'
        ? err
        : new errors.EmailError({
            err,
            code: 'BULK_EMAIL_SEND_FAILED',
            message: `Error sending email batch ${batch.id}`,
            context: err.message,
          });
    logging.error(loggedError);
    if (this.#sentry && err.retryable !== false) {
      // Read the raw error; integrity failures are reported once by emailJob
      // after persisted verification. Provider errors retain their original data.
      this.#sentry.captureException(err);
    }
  }

  async #markBatchProcessed(batch) {
    await this.retryDb(
      () =>
        this.#models.EmailRecipient.where({ batch_id: batch.id }).save(
          { processed_at: new Date() },
          { patch: true, require: false, autoRefresh: false },
        ),
      {
        ...this.#getAfterRetryConfig(),
        description: `save EmailRecipients ${batch.id} processed_at`,
      },
    );
  }

  /**
   * We don't want to pass EmailRecipient models to the sendingService.
   * So we transform them into the MemberLike interface.
   * That keeps the sending service nicely separated so it isn't dependent on the batch sending data structure.
   * @returns {Promise<MemberLike[]>}
   */
  async getBatchMembers(batchId, expectedCount) {
    let models = await this.#models.EmailRecipient.findAll({
      filter: `batch_id:'${batchId}'`,
      withRelated: ['member', 'member.stripeSubscriptions', 'member.products'],
    });

    const BATCH_SIZE = this.#sendingService.getMaximumRecipients();
    if (expectedCount !== undefined && models.length !== expectedCount) {
      throw new errors.EmailError({
        code: RECIPIENT_READ_MISMATCH,
        message: `Email batch ${batchId} has ${models.length} recipients, expected ${expectedCount}`,
        errorDetails: JSON.stringify({ expected: expectedCount, actual: models.length }),
      });
    }
    if (models.length > BATCH_SIZE) {
      throw new errors.EmailError({
        message: `Email batch ${batchId} has ${models.length} members, which exceeds the maximum of ${BATCH_SIZE} members per batch.`,
      });
    }

    return models.map((model) => {
      // Map subscriptions
      const subscriptions = model.related('member').related('stripeSubscriptions').toJSON();
      const tiers = model.related('member').related('products').toJSON();

      return {
        id: model.get('member_id'),
        uuid: model.get('member_uuid'),
        email: model.get('member_email'),
        name: model.get('member_name'),
        createdAt: model.related('member')?.get('created_at') ?? null,
        status: model.related('member')?.get('status') ?? 'free',
        subscriptions,
        tiers,
      };
    });
  }

  /**
   * @private
   * Update the status of an email or emailBatch to a given status, but first check if their current status is 'pending' or 'failed'.
   * @param {object} Model Bookshelf model constructor
   * @param {string} id id of the model
   * @param {string} status set the status of the model to this value
   * @param {string[]} allowedStatuses Check if the models current status is one of these values
   * @param {object} [options]
   * @param {boolean} [options.autoRefresh=false] Refresh within the transaction for callers returning the model to the API.
   * @returns {Promise<object|undefined>} The updated model. Undefined if the model didn't pass the status check.
   */
  async updateStatusLock(Model, id, status, allowedStatuses, { autoRefresh = false } = {}) {
    let model;
    await Model.transaction(async (transacting) => {
      model = await Model.findOne({ id }, { require: true, transacting, forUpdate: true });
      if (!allowedStatuses.includes(model.get('status'))) {
        model = undefined;
        return;
      }
      await model.save(
        {
          status,
        },
        { patch: true, transacting, autoRefresh },
      );
    });
    return model;
  }

  /**
   * @private
   * Retry a function until it doesn't throw an error or the max retries / max time are reached.
   * @template T
   * @param {() => Promise<T>} func
   * @param {object} options
   * @param {string} options.description Used for logging
   * @param {number} options.sleep time between each retry (ms), will get multiplied by the number of retries
   * @param {number} options.maxRetries note: retries, not tries. So 0 means maximum 1 try, 1 means maximum 2 tries, etc.
   * @param {number} [options.retryCount] (internal) Amount of retries already done. 0 intially.
   * @param {number} [options.maxTime] (ms)
   * @param {Date} [options.stopAfterDate]
   * @param {AbortSignal} [options.signal] Stops preparation retries, not an in-flight operation
   * @returns {Promise<T>}
   */
  async retryDb(func, options) {
    options.signal?.throwIfAborted();
    options = this.#resolveRetryOptions(options);
    const retryCount = options.retryCount ?? 0;

    try {
      if (retryCount > 0) {
        logging.info(
          `[BULK_EMAIL_DB_RETRY] ${options.description} - Retrying ${retryCount + 1}th try`,
        );
      } else {
        logging.info(`[BULK_EMAIL_DB_RETRY] ${options.description} - Started (1st try)`);
      }

      const response = await func();

      logging.info(
        `[BULK_EMAIL_DB_RETRY] ${options.description} - Finished (after ${retryCount + 1}${retryCount === 0 ? 'st try' : ' tries'})`,
      );

      return response;
    } catch (e) {
      if (e.retryable === false) {
        throw e;
      }
      options.signal?.throwIfAborted();
      // Shutdown may have started while this attempt was pending — re-resolve so
      // the collapsed budget decides whether we retry at all
      options = this.#resolveRetryOptions(options);

      const sleep = options.sleep ?? 0;
      if (
        retryCount >= options.maxRetries ||
        (options.stopAfterDate && new Date(Date.now() + sleep) > options.stopAfterDate)
      ) {
        if (retryCount > 0) {
          const ghostError = new errors.EmailError({
            err: e,
            code: 'BULK_EMAIL_DB_RETRY',
            message: `[BULK_EMAIL_DB_RETRY] ${options.description} - Failed and stopped retrying: ${retryCount >= options.maxRetries ? 'max retries reached' : 'max time reached'}`,
            context: e.message,
          });

          logging.error(ghostError);
        }
        throw e;
      }

      const ghostError = new errors.EmailError({
        err: e,
        code: 'BULK_EMAIL_DB_RETRY',
        message: `[BULK_EMAIL_DB_RETRY] ${options.description} - Failed (${retryCount + 1}${retryCount === 0 ? 'st' : 'th'} try)`,
        context: e.message,
      });

      logging.error(ghostError);

      if (sleep) {
        await waitForPreparationRetry(sleep, options.signal);
      }

      // Budget is only checked after a failure, so recursing always spends another
      // attempt first. Re-check here, or a shutdown that began during the backoff
      // gets one more go — a fresh Mailgun send well into a shutdown.
      const nextOptions = this.#resolveRetryOptions({
        ...options,
        retryCount: retryCount + 1,
        sleep: sleep * 2,
      });
      if (
        nextOptions.retryCount > nextOptions.maxRetries ||
        (nextOptions.stopAfterDate && new Date() > nextOptions.stopAfterDate)
      ) {
        throw e;
      }

      return await this.retryDb(func, nextOptions);
    }
  }

  /**
   * Returns the sending deadline for an email
   * Based on the email.created_at timestamp and the configured target delivery window
   * @param {*} email
   * @returns Date | undefined
   */
  getDeliveryDeadline(email) {
    // Return undefined if targetDeliveryWindow is 0 (or less)
    const targetDeliveryWindow = this.#sendingService.getTargetDeliveryWindow();
    if (targetDeliveryWindow === undefined || targetDeliveryWindow <= 0) {
      return undefined;
    }
    try {
      const startTime = email.get('created_at');
      const deadline = new Date(startTime.getTime() + targetDeliveryWindow);
      return deadline;
    } catch (err) {
      return undefined;
    }
  }

  /**
   * Adds deliverytimes to the passed in batches, based on the delivery deadline
   * @param {Email} email - the email model to be sent
   * @param {number} numBatches - the number of batches to be sent
   */
  calculateDeliveryTimes(email, numBatches) {
    let deadline = this.getDeliveryDeadline(email);
    if (!deadline) {
      return new Array(numBatches).fill(undefined);
    }
    const now = new Date();
    // If the original `created_at + targetDeliveryWindow` deadline has passed (resume
    // of an interrupted send, or a job that was delayed for any reason), respread
    // batches over a fresh window of the same size starting now. Otherwise a
    // 50%-resumed 10-minute send would dump every remaining batch into Mailgun in
    // the same second and defeat the rate-spread.
    if (now >= deadline) {
      const targetDeliveryWindow = this.#sendingService.getTargetDeliveryWindow();
      deadline = new Date(now.getTime() + targetDeliveryWindow);
    }
    const timeToDeadline = deadline.getTime() - now.getTime();
    const batchDelay = timeToDeadline / numBatches;
    const deliveryTimes = [];
    for (let i = 0; i < numBatches; i++) {
      const delay = batchDelay * i;
      const deliveryTime = new Date(now.getTime() + delay);
      deliveryTimes.push(deliveryTime);
    }
    return deliveryTimes;
  }
}

module.exports = BatchSendingService;
module.exports.SHUTDOWN_CODE = SHUTDOWN_CODE;
