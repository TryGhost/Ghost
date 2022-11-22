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
 * @typedef {object} JobsService
 * @typedef {object} Email
 * @typedef {object} Newsletter
 * @typedef {object} EmailBatch
 */

class BatchSendingService {
    #sendingService;
    #emailSegmenter;
    #jobsService;
    #models;
    #db;

    /**
     * @param {Object} dependencies 
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
        sendingService,
        jobsService,
        emailSegmenter,
        models,
        db
    }) {
        this.#sendingService = sendingService;
        this.#jobsService = jobsService;
        this.#emailSegmenter = emailSegmenter;
        this.#models = models;
        this.#db = db;
    }

    /**
     * @param {Email} email 
     * @returns {void}
     */
    scheduleEmail(email) {
        // schedule background job that calls sendEmail
        return this.#jobsService.addJob({
            job: this.emailJob.bind(this),
            data: {emailId: email.id},
            offloaded: false
        });
    }

    async emailJob({emailId}) {
        logging.info(`Starting email job for email ${emailId}`);

        // Check if email is 'pending' only + change status to submitting in one transaction.
        // This allows us to have a lock around the email job that makes sure an email can only have one active job.
        let email;
        await this.#models.Email.transaction(async (transacting) => {
            email = await this.#models.Email.findOne({id: emailId}, {require: true, transacting, forUpdate: true});
            if (email.get('status') !== 'pending' && email.get('status') !== 'failed') {
                logging.error(`Tried sending email that is not pending or failed ${emailId}; status: ${email.get('status')}`);
                email = undefined;
                return;
            }
            await email.save({
                status: 'submitting'
            }, {patch: true, transacting});
        });

        if (!email) {
            return;
        }

        try {
            await this.sendEmail(email);

            await email.save({
                status: 'submitted',
                submitted_at: new Date(),
                error: null
                // todo: add new error fields if any
            }, {patch: true});
        } catch (e) {
            logging.error(`Error sending email ${email.id}: ${e.message}`);
            
            // Edge case: Store error in email model (that are not caught by the batch)
            await email.save({
                status: 'failed',
                error: e.message || 'Something went wrong while sending the email' // TODO: check if we can improve error message data
            }, {patch: true});
        }
    }

    /**
     * @private
     * @param {Email} email 
     * @returns {Promise<boolean>} True if every email succeeded
     */
    async sendEmail(email) {
        logging.info(`Sending email ${email.id}`);

        // Load required relations
        const newsletter = await email.getLazyRelation('newsletter', {require: false}); // TODO: consider making newsletter required
        const post = await email.getLazyRelation('post', {require: true});

        let batches = await this.getBatches(email);
        if (batches.length === 0) {
            batches = await this.createBatches(email, newsletter);
        }
        return await this.sendBatches({email, batches, post, newsletter});
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
     * @param {Email} email
     * @param {Newsletter} newsletter
     * @returns {Promise<EmailBatch[]>}
     */
    async createBatches(email, newsletter) {
        logging.info(`Creating batches for email ${email.id}`);

        const segments = [null]; // TODO: get segments from email
        const batches = [];
        const BATCH_SIZE = 500; // TODO: should be configured in email provider
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
                members = await this.#models.Member.getFilteredCollectionQuery({filter, order: 'id DESC'}).select('members.id', 'members.uuid', 'members.email', 'members.name').limit(BATCH_SIZE + 1);

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

        // Loop batches and send them via the emailproviderservice
        // TODO: send x batches in parallel
        let succeededCount = 0;
        for (const batch of batches) {
            if (await this.sendBatch({email, batch, post, newsletter})) {
                succeededCount += 1;
            }
        }

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
     * @param {*} param0 
     * @returns {Promise<boolean>} True when succeeded, false when failed with an error
     */
    async sendBatch({email, batch, post, newsletter}) {
        logging.info(`Sending batch ${batch.id} for email ${email.id}`);

        // Check the status of the email batch in a 'for update' transaction
        await this.#models.EmailBatch.transaction(async (transacting) => {
            batch = await this.#models.EmailBatch.findOne({id: batch.id}, {require: true, transacting, forUpdate: true});
            if (batch.get('status') !== 'pending' && batch.get('status') !== 'failed') {
                logging.error(`Tried sending email batch that is not pending or failed ${batch.id}; status: ${batch.get('status')}`);
                batch = undefined;
                return;
            }
            await batch.save({
                status: 'submitting'
            }, {patch: true, transacting});
        });

        if (!batch) {
            // Already sent
            return true;
        }

        let succeeded = false;

        try {
            const members = await this.getBatchMembers(batch.id);
            const response = await this.#sendingService.send({
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
                provider_id: response.id
            }, {patch: true, require: false});
            succeeded = true;
        } catch (err) {
            logging.error(`Error sending email batch ${batch.id}`, err);
            
            await batch.save({
                status: 'failed'
                // TODO: error should be instance of EmailProviderError (see IEmailProviderService) + we should read error message
                // error_status_code: err.status_code,
                // error_message: err.message_short,
                // error_data: err.message_full
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
}

module.exports = BatchSendingService;
