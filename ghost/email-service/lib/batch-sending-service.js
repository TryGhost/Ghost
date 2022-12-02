const logging = require('@tryghost/logging');
const ObjectID = require('bson-objectid').default;
const errors = require('@tryghost/errors');
const tpl = require('@tryghost/tpl');

const messages = {
    emailErrorPartialFailure: 'The email was only partially send',
    emailError: 'Email failed to send'
};

/**
 * @typedef {import('./sending-service')} SendingService
 * @typedef {import('./email-segmenter')} EmailSegmenter
 * @typedef {import('./email-renderer')} EmailRenderer
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
    #jobsService;
    #models;
    #db;

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
     */
    constructor({
        emailRenderer,
        sendingService,
        jobsService,
        emailSegmenter,
        models,
        db
    }) {
        this.#emailRenderer = emailRenderer;
        this.#sendingService = sendingService;
        this.#jobsService = jobsService;
        this.#emailSegmenter = emailSegmenter;
        this.#models = models;
        this.#db = db;
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

        // Check if email is 'pending' only + change status to submitting in one transaction.
        // This allows us to have a lock around the email job that makes sure an email can only have one active job.
        let email = await this.updateStatusLock(this.#models.Email, emailId, 'submitting', ['pending', 'failed']);
        if (!email) {
            logging.error(`Tried sending email that is not pending or failed ${emailId}`);
            return;
        }

        try {
            await this.sendEmail(email);

            await email.save({
                status: 'submitted',
                submitted_at: new Date(),
                error: null
            }, {patch: true});
        } catch (e) {
            logging.error(`Error sending email ${email.id}: ${e.message}`);

            // Edge case: Store error in email model (that are not caught by the batch)
            await email.save({
                status: 'failed',
                error: e.message || 'Something went wrong while sending the email'
            }, {patch: true});
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
        const newsletter = await email.getLazyRelation('newsletter', {require: true});
        const post = await email.getLazyRelation('post', {require: true, withRelated: ['posts_meta', 'authors']});

        let batches = await this.getBatches(email);
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
            let lastId = null;

            while (!members || lastId) {
                logging.info(`Fetching members batch for email ${email.id} segment ${segment}, lastId: ${lastId}`);

                const filter = segmentFilter + (lastId ? `+id:<${lastId}` : '');
                members = await this.#models.Member.getFilteredCollectionQuery({filter})
                    .orderByRaw('id DESC')
                    .select('members.id', 'members.uuid', 'members.email', 'members.name').limit(BATCH_SIZE + 1);

                if (members.length > BATCH_SIZE) {
                    lastId = members[members.length - 2].id;
                } else {
                    lastId = null;
                }

                if (members.length > 0) {
                    totalCount += Math.min(members.length, BATCH_SIZE);
                    const batch = await this.createBatch(email, segment, members.slice(0, BATCH_SIZE));
                    batches.push(batch);
                }
            }
        }

        logging.info(`Created ${batches.length} batches for email ${email.id} with ${totalCount} recipients`);

        if (email.get('email_count') !== totalCount) {
            logging.error(`Email ${email.id} has wrong recipient count ${totalCount}, expected ${email.get('email_count')}. Updating the model.`);

            // We update the email model because this will probably happen a few times because of the time difference
            // between creating the email and sending it (or when the email failed initially and is retried a day later)
            await email.save({
                email_count: totalCount
            }, {patch: true, require: false});
        }
        return batches;
    }

    /**
     * @private
     * @param {Email} email
     * @param {import('./email-renderer').Segment} segment
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

        // Loop batches and send them via the EmailProvider
        let succeededCount = 0;
        const queue = batches.slice();

        // Bind this
        let runNext;
        runNext = async () => {
            const batch = queue.shift();
            if (batch) {
                if (await this.sendBatch({email, batch, post, newsletter})) {
                    succeededCount += 1;
                }
                await runNext();
            }
        };

        // Run maximum 10 at the same time
        await Promise.all(new Array(10).fill(0).map(() => runNext()));

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
    async sendBatch({email, batch: originalBatch, post, newsletter}) {
        logging.info(`Sending batch ${originalBatch.id} for email ${email.id}`);

        // Check the status of the email batch in a 'for update' transaction
        const batch = await this.updateStatusLock(this.#models.EmailBatch, originalBatch.id, 'submitting', ['pending', 'failed']);
        if (!batch) {
            logging.error(`Tried sending email batch that is not pending or failed ${originalBatch.id}`);
            return true;
        }

        let succeeded = false;

        try {
            const members = await this.getBatchMembers(batch.id);
            const response = await this.#sendingService.send({
                emailId: email.id,
                post,
                newsletter,
                segment: batch.get('member_segment'),
                members
            }, {
                openTrackingEnabled: !!email.get('track_opens'),
                clickTrackingEnabled: !!email.get('track_clicks')
            });

            await batch.save({
                status: 'submitted',
                provider_id: response.id,
                // reset error fields when sending succeeds
                error_status_code: null,
                error_message: null,
                error_data: null
            }, {patch: true, require: false});
            succeeded = true;
        } catch (err) {
            logging.error(`Error sending email batch ${batch.id}`);
            logging.error(err);

            await batch.save({
                status: 'failed',
                error_status_code: err.statusCode,
                error_message: err.message,
                error_data: err.errorDetails
            }, {patch: true, require: false});
        }

        // Mark as processed, even when failed
        await this.#models.EmailRecipient
            .where({batch_id: batch.id})
            .save({processed_at: new Date()}, {patch: true, require: false});

        return succeeded;
    }

    /**
     * We don't want to pass EmailRecipient models to the sendingService.
     * So we transform them into the MemberLike interface.
     * That keeps the sending service nicely seperated so it isn't dependent on the batch sending data structure.
     * @returns {Promise<MemberLike[]>}
     */
    async getBatchMembers(batchId) {
        const models = await this.#models.EmailRecipient.findAll({filter: `batch_id:${batchId}`});
        return models.map((model) => {
            return {
                id: model.get('member_id'),
                uuid: model.get('member_uuid'),
                email: model.get('member_email'),
                name: model.get('member_name')
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
            }, {patch: true, transacting});
        });
        return model;
    }
}

module.exports = BatchSendingService;
