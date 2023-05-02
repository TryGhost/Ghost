const logging = require('@tryghost/logging');
const ObjectID = require('bson-objectid').default;
const errors = require('@tryghost/errors');
const tpl = require('@tryghost/tpl');
const EmailBodyCache = require('./EmailBodyCache');

const messages = {
    emailErrorPartialFailure: 'An error occurred, and your newsletter was only partially sent. Please retry sending the remaining emails.',
    emailError: 'An unexpected error occurred, please retry sending your newsletter.'
};

const MAX_SENDING_CONCURRENCY = 2;

/**
 * @typedef {import('./SendingService')} SendingService
 * @typedef {import('./EmailSegmenter')} EmailSegmenter
 * @typedef {import('./EmailRenderer')} EmailRenderer
 * @typedef {import('./EmailRenderer').MemberLike} MemberLike
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
    #jobsService;
    #models;
    #db;
    #sentry;

    // Retry database queries happening before sending the email
    #BEFORE_RETRY_CONFIG = {maxRetries: 10, maxTime: 10 * 60 * 1000, sleep: 2000};
    #AFTER_RETRY_CONFIG = {maxRetries: 20, maxTime: 30 * 60 * 1000, sleep: 2000};
    #MAILGUN_API_RETRY_CONFIG = {sleep: 10 * 1000, maxRetries: 6};

    /**
     * @param {Object} dependencies
     * @param {EmailRenderer} dependencies.emailRenderer
     * @param {SendingService} dependencies.sendingService
     * @param {JobsService} dependencies.jobsService
     * @param {EmailSegmenter} dependencies.emailSegmenter
     * @param {object} dependencies.models
     * @param {object} dependencies.models.EmailRecipient
     * @param {EmailBatch} dependencies.models.EmailBatch
     * @param {Email} dependencies.models.Email
     * @param {object} dependencies.models.Member
     * @param {object} dependencies.db
     * @param {object} [dependencies.sentry]
     * @param {object} [dependencies.BEFORE_RETRY_CONFIG]
     * @param {object} [dependencies.AFTER_RETRY_CONFIG]
     */
    constructor({
        emailRenderer,
        sendingService,
        jobsService,
        emailSegmenter,
        models,
        db,
        sentry,
        BEFORE_RETRY_CONFIG,
        AFTER_RETRY_CONFIG,
        MAILGUN_API_RETRY_CONFIG
    }) {
        this.#emailRenderer = emailRenderer;
        this.#sendingService = sendingService;
        this.#jobsService = jobsService;
        this.#emailSegmenter = emailSegmenter;
        this.#models = models;
        this.#db = db;
        this.#sentry = sentry;

        if (BEFORE_RETRY_CONFIG) {
            this.#BEFORE_RETRY_CONFIG = BEFORE_RETRY_CONFIG;
        } else {
            if (process.env.NODE_ENV.startsWith('test') || process.env.NODE_ENV === 'development') {
                this.#BEFORE_RETRY_CONFIG = {maxRetries: 0};
            }
        }
        if (AFTER_RETRY_CONFIG) {
            this.#AFTER_RETRY_CONFIG = AFTER_RETRY_CONFIG;
        } else {
            if (process.env.NODE_ENV.startsWith('test') || process.env.NODE_ENV === 'development') {
                this.#AFTER_RETRY_CONFIG = {maxRetries: 0};
            }
        }

        if (MAILGUN_API_RETRY_CONFIG) {
            this.#MAILGUN_API_RETRY_CONFIG = MAILGUN_API_RETRY_CONFIG;
        } else {
            if (process.env.NODE_ENV.startsWith('test') || process.env.NODE_ENV === 'development') {
                this.#MAILGUN_API_RETRY_CONFIG = {maxRetries: 0};
            }
        }
    }

    #getBeforeRetryConfig(email) {
        if (email._retryCutOffTime) {
            return {...this.#BEFORE_RETRY_CONFIG, stopAfterDate: email._retryCutOffTime};
        }
        return this.#BEFORE_RETRY_CONFIG;
    }

    /**
     * Schedules a background job that sends the email in the background if it is pending or failed.
     * @param {Email} email
     * @returns {void}
     */
    scheduleEmail(email) {
        return this.#jobsService.addJob({
            name: 'batch-sending-service-job',
            job: this.emailJob.bind(this),
            data: {emailId: email.id},
            offloaded: false
        });
    }

    /**
     * @private
     * @param {{emailId: string}} data Data passed from the job service. We only need the emailId because we need to refetch the email anyway to make sure the status is right and 'locked'.
     */
    async emailJob({emailId}) {
        logging.info(`Starting email job for email ${emailId}`);

        // We'll stop all automatic DB retries after this date
        const retryCutOffTime = new Date(Date.now() + this.#BEFORE_RETRY_CONFIG.maxTime);

        // Check if email is 'pending' only + change status to submitting in one transaction.
        // This allows us to have a lock around the email job that makes sure an email can only have one active job.
        let email = await this.retryDb(
            async () => {
                return await this.updateStatusLock(this.#models.Email, emailId, 'submitting', ['pending', 'failed']);
            },
            {...this.#BEFORE_RETRY_CONFIG, description: `updateStatusLock email ${emailId} -> submitting`}
        );
        if (!email) {
            logging.error(`Tried sending email that is not pending or failed ${emailId}`);
            return;
        }

        // Save a strict cutoff time for retries
        email._retryCutOffTime = retryCutOffTime;

        try {
            await this.sendEmail(email);
            await this.retryDb(async () => {
                await email.save({
                    status: 'submitted',
                    submitted_at: new Date(),
                    error: null
                }, {patch: true, autoRefresh: false});
            }, {...this.#AFTER_RETRY_CONFIG, description: `email ${emailId} -> submitted`});
        } catch (e) {
            const ghostError = new errors.EmailError({
                err: e,
                code: 'BULK_EMAIL_SEND_FAILED',
                message: `Error sending email ${email.id}`
            });

            logging.error(ghostError);
            if (this.#sentry) {
                // Log the original error to Sentry
                this.#sentry.captureException(e);
            }

            // Store error and status in email model
            await this.retryDb(async () => {
                await email.save({
                    status: 'failed',
                    error: e.message || 'Something went wrong while sending the email'
                }, {patch: true, autoRefresh: false});
            }, {...this.#AFTER_RETRY_CONFIG, description: `email ${emailId} -> failed`});
        }
    }

    /**
     * @private
     * @param {Email} email
     * @throws {errors.EmailError} If one of the batches fails
     */
    async sendEmail(email) {
        logging.info(`Sending email ${email.id}`);

        // Load required relations
        const newsletter = await this.retryDb(async () => {
            return await email.getLazyRelation('newsletter', {require: true});
        }, {...this.#getBeforeRetryConfig(email), description: `getLazyRelation newsletter for email ${email.id}`});

        const post = await this.retryDb(async () => {
            return await email.getLazyRelation('post', {require: true, withRelated: ['posts_meta', 'authors']});
        }, {...this.#getBeforeRetryConfig(email), description: `getLazyRelation post for email ${email.id}`});

        let batches = await this.retryDb(async () => {
            return await this.getBatches(email);
        }, {...this.#getBeforeRetryConfig(email), description: `getBatches for email ${email.id}`});

        if (batches.length === 0) {
            batches = await this.createBatches({email, newsletter, post});
        }
        await this.sendBatches({email, batches, post, newsletter});
    }

    /**
     * @private
     * @param {Email} email
     * @returns {Promise<EmailBatch[]>}
     */
    async getBatches(email) {
        logging.info(`Getting batches for email ${email.id}`);

        return await this.#models.EmailBatch.findAll({filter: 'email_id:' + email.id});
    }

    /**
     * @private
     * @param {{email: Email, newsletter: Newsletter, post: Post}} data
     * @returns {Promise<EmailBatch[]>}
     */
    async createBatches({email, post, newsletter}) {
        logging.info(`Creating batches for email ${email.id}`);

        const segments = this.#emailRenderer.getSegments(post);
        const batches = [];
        const BATCH_SIZE = this.#sendingService.getMaximumRecipients();
        let totalCount = 0;

        for (const segment of segments) {
            logging.info(`Creating batches for email ${email.id} segment ${segment}`);

            const segmentFilter = this.#emailSegmenter.getMemberFilterForSegment(newsletter, email.get('recipient_filter'), segment);

            // Avoiding Bookshelf for performance reasons
            let members;

            // Start with the id of the email, which is an objectId. We'll only fetch members that are created before the email. This is a special property of ObjectIds.
            // Note: we use ID and not created_at, because imported members could set a created_at in the future or past and avoid limit checking.
            let lastId = email.id;

            while (!members || lastId) {
                logging.info(`Fetching members batch for email ${email.id} segment ${segment}, lastId: ${lastId}`);

                const filter = segmentFilter + `+id:<${lastId}`;
                members = await this.#models.Member.getFilteredCollectionQuery({filter})
                    .orderByRaw('id DESC')
                    .select('members.id', 'members.uuid', 'members.email', 'members.name').limit(BATCH_SIZE + 1);

                if (members.length > 0) {
                    totalCount += Math.min(members.length, BATCH_SIZE);
                    const batch = await this.retryDb(
                        async () => {
                            return await this.createBatch(email, segment, members.slice(0, BATCH_SIZE));
                        },
                        {...this.#getBeforeRetryConfig(email), description: `createBatch email ${email.id} segment ${segment}`}
                    );
                    batches.push(batch);
                }

                if (members.length > BATCH_SIZE) {
                    lastId = members[members.length - 2].id;
                } else {
                    break;
                }
            }
        }

        logging.info(`Created ${batches.length} batches for email ${email.id} with ${totalCount} recipients`);

        if (email.get('email_count') !== totalCount) {
            logging.error(`Email ${email.id} has wrong stored email_count ${email.get('email_count')}, did expect ${totalCount}. Updating the model.`);

            // We update the email model because this might happen in rare cases where the initial member count changed (e.g. deleted members)
            // between creating the email and sending it
            await email.save({
                email_count: totalCount
            }, {patch: true, require: false, autoRefresh: false});
        }
        return batches;
    }

    /**
     * @private
     * @param {Email} email
     * @param {import('./EmailRenderer').Segment} segment
     * @param {object[]} members
     * @returns {Promise<EmailBatch>}
     */
    async createBatch(email, segment, members, options) {
        if (!options || !options.transacting) {
            return this.#models.EmailBatch.transaction(async (transacting) => {
                return this.createBatch(email, segment, members, {transacting});
            });
        }

        logging.info(`Creating batch for email ${email.id} segment ${segment} with ${members.length} members`);

        const batch = await this.#models.EmailBatch.add({
            email_id: email.id,
            member_segment: segment,
            status: 'pending'
        }, options);

        const recipientData = [];

        members.forEach((memberRow) => {
            if (!memberRow.id || !memberRow.uuid || !memberRow.email) {
                logging.warn(`Member row not included as email recipient due to missing data - id: ${memberRow.id}, uuid: ${memberRow.uuid}, email: ${memberRow.email}`);
                return;
            }

            recipientData.push({
                id: ObjectID().toHexString(),
                email_id: email.id,
                member_id: memberRow.id,
                batch_id: batch.id,
                member_uuid: memberRow.uuid,
                member_email: memberRow.email,
                member_name: memberRow.name
            });
        });

        const insertQuery = this.#db.knex('email_recipients').insert(recipientData);

        if (options.transacting) {
            insertQuery.transacting(options.transacting);
        }

        logging.info(`Inserting ${recipientData.length} recipients for email ${email.id} batch ${batch.id}`);
        await insertQuery;
        return batch;
    }

    async sendBatches({email, batches, post, newsletter}) {
        logging.info(`Sending ${batches.length} batches for email ${email.id}`);

        // Reuse same HTML body if we send an email to the same segment
        const emailBodyCache = new EmailBodyCache();

        // Loop batches and send them via the EmailProvider
        let succeededCount = 0;
        const queue = batches.slice();

        // Bind this
        let runNext;
        runNext = async () => {
            const batch = queue.shift();
            if (batch) {
                if (await this.sendBatch({email, batch, post, newsletter, emailBodyCache})) {
                    succeededCount += 1;
                }
                await runNext();
            }
        };

        // Run maximum MAX_SENDING_CONCURRENCY at the same time
        await Promise.all(new Array(MAX_SENDING_CONCURRENCY).fill(0).map(() => runNext()));

        if (succeededCount < batches.length) {
            if (succeededCount > 0) {
                throw new errors.EmailError({
                    message: tpl(messages.emailErrorPartialFailure)
                });
            }
            throw new errors.EmailError({
                message: tpl(messages.emailError)
            });
        }
    }

    /**
     *
     * @param {{email: Email, batch: EmailBatch, post: Post, newsletter: Newsletter}} data
     * @returns {Promise<boolean>} True when succeeded, false when failed with an error
     */
    async sendBatch({email, batch: originalBatch, post, newsletter, emailBodyCache}) {
        logging.info(`Sending batch ${originalBatch.id} for email ${email.id}`);

        // Check the status of the email batch in a 'for update' transaction

        const batch = await this.retryDb(
            async () => {
                return await this.updateStatusLock(this.#models.EmailBatch, originalBatch.id, 'submitting', ['pending', 'failed']);
            },
            {...this.#getBeforeRetryConfig(email), description: `updateStatusLock batch ${originalBatch.id} -> submitting`}
        );
        if (!batch) {
            logging.error(`Tried sending email batch that is not pending or failed ${originalBatch.id}`);
            return true;
        }

        let succeeded = false;

        try {
            const members = await this.retryDb(
                async () => {
                    const m = await this.getBatchMembers(batch.id);

                    // If we receive 0 rows, there is a possibility that we switched to a secondary database and have replication lag
                    // So we throw an error and we retry
                    if (m.length === 0) {
                        throw new errors.EmailError({
                            message: `No members found for batch ${batch.id}, possible replication lag`
                        });
                    }

                    return m;
                },
                {...this.#getBeforeRetryConfig(email), description: `getBatchMembers batch ${originalBatch.id}`}
            );

            const response = await this.retryDb(async () => {
                return await this.#sendingService.send({
                    emailId: email.id,
                    post,
                    newsletter,
                    segment: batch.get('member_segment'),
                    members
                }, {
                    openTrackingEnabled: !!email.get('track_opens'),
                    clickTrackingEnabled: !!email.get('track_clicks'),
                    emailBodyCache
                });
            }, {...this.#MAILGUN_API_RETRY_CONFIG, description: `Sending email batch ${originalBatch.id}`});
            succeeded = true;

            await this.retryDb(
                async () => {
                    await batch.save({
                        status: 'submitted',
                        provider_id: response.id,
                        // reset error fields when sending succeeds
                        error_status_code: null,
                        error_message: null,
                        error_data: null
                    }, {patch: true, require: false, autoRefresh: false});
                },
                {...this.#AFTER_RETRY_CONFIG, description: `save batch ${originalBatch.id} -> submitted`}
            );
        } catch (err) {
            if (err.code && err.code === 'BULK_EMAIL_SEND_FAILED') {
                logging.error(err);
                if (this.#sentry) {
                    // Log the original error to Sentry
                    this.#sentry.captureException(err);
                }
            } else {
                const ghostError = new errors.EmailError({
                    err,
                    code: 'BULK_EMAIL_SEND_FAILED',
                    message: `Error sending email batch ${batch.id}`,
                    context: err.message
                });

                logging.error(ghostError);
                if (this.#sentry) {
                    // Log the original error to Sentry
                    this.#sentry.captureException(err);
                }
            }

            if (!succeeded) {
                // We check succeeded because a Rare edge case where the batch was send, but we failed to set status to submitted, then we don't want to set it to failed
                await this.retryDb(
                    async () => {
                        await batch.save({
                            status: 'failed',
                            error_status_code: err.statusCode ?? null,
                            error_message: err.message,
                            error_data: err.errorDetails ?? null
                        }, {patch: true, require: false, autoRefresh: false});
                    },
                    {...this.#AFTER_RETRY_CONFIG, description: `save batch ${originalBatch.id} -> failed`}
                );
            }
        }

        // Mark as processed, even when failed
        await this.retryDb(
            async () => {
                await this.#models.EmailRecipient
                    .where({batch_id: batch.id})
                    .save({processed_at: new Date()}, {patch: true, require: false, autoRefresh: false});
            },
            {...this.#AFTER_RETRY_CONFIG, description: `save EmailRecipients ${originalBatch.id} processed_at`}
        );

        return succeeded;
    }

    /**
     * We don't want to pass EmailRecipient models to the sendingService.
     * So we transform them into the MemberLike interface.
     * That keeps the sending service nicely seperated so it isn't dependent on the batch sending data structure.
     * @returns {Promise<MemberLike[]>}
     */
    async getBatchMembers(batchId) {
        const models = await this.#models.EmailRecipient.findAll({filter: `batch_id:${batchId}`, withRelated: ['member', 'member.stripeSubscriptions', 'member.products']});
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
                tiers
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
     * @returns {Promise<object|undefined>} The updated model. Undefined if the model didn't pass the status check.
     */
    async updateStatusLock(Model, id, status, allowedStatuses) {
        let model;
        await Model.transaction(async (transacting) => {
            model = await Model.findOne({id}, {require: true, transacting, forUpdate: true});
            if (!allowedStatuses.includes(model.get('status'))) {
                model = undefined;
                return;
            }
            await model.save({
                status
            }, {patch: true, transacting, autoRefresh: false});
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
     * @returns {Promise<T>}
     */
    async retryDb(func, options) {
        if (options.maxTime !== undefined) {
            const stopAfterDate = new Date(Date.now() + options.maxTime);
            if (!options.stopAfterDate || stopAfterDate < options.stopAfterDate) {
                options = {...options, stopAfterDate};
            }
        }

        try {
            return await func();
        } catch (e) {
            const retryCount = (options.retryCount ?? 0);
            const sleep = (options.sleep ?? 0);
            if (retryCount >= options.maxRetries || (options.stopAfterDate && (new Date(Date.now() + sleep)) > options.stopAfterDate)) {
                if (retryCount > 0) {
                    const ghostError = new errors.EmailError({
                        err: e,
                        code: 'BULK_EMAIL_DB_RETRY',
                        message: `[BULK_EMAIL_DB_RETRY] ${options.description} - Stopped retrying`,
                        context: e.message
                    });

                    logging.error(ghostError);
                }
                throw e;
            }

            const ghostError = new errors.EmailError({
                err: e,
                code: 'BULK_EMAIL_DB_RETRY',
                message: `[BULK_EMAIL_DB_RETRY] ${options.description} - After ${retryCount} retries`,
                context: e.message
            });

            logging.error(ghostError);

            if (sleep) {
                await new Promise((resolve) => {
                    setTimeout(resolve, sleep);
                });
            }
            return await this.retryDb(func, {...options, retryCount: retryCount + 1, sleep: sleep * 2});
        }
    }
}

module.exports = BatchSendingService;
