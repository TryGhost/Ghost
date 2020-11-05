const _ = require('lodash');
const Promise = require('bluebird');
const moment = require('moment-timezone');
const errors = require('@tryghost/errors');
const {i18n} = require('../../lib/common');
const logging = require('../../../shared/logging');
const models = require('../../models');
const mailgunProvider = require('./mailgun');
const sentry = require('../../../shared/sentry');
const debug = require('ghost-ignition').debug('mega');
const postEmailSerializer = require('../mega/post-email-serializer');

const BATCH_SIZE = mailgunProvider.BATCH_SIZE;

/**
 * An object representing batch request result
 * @typedef { Object } BatchResultBase
 * @property { string } data - data that is returned from Mailgun or one which Mailgun was called with
 */
class BatchResultBase {
    constructor(id) {
        this.id = id;
    }
}

class SuccessfulBatch extends BatchResultBase { }

class FailedBatch extends BatchResultBase {
    constructor(id, error) {
        super(...arguments);
        error.originalMessage = error.message;

        if (error.statusCode >= 500) {
            error.message = 'Email service is currently unavailable - please try again';
        } else if (error.statusCode === 401) {
            error.message = 'Email failed to send - please verify your credentials';
        } else if (error.message && error.message.toLowerCase().includes('dmarc')) {
            error.message = 'Unable to send email from domains implementing strict DMARC policies';
        } else if (error.message.includes(`'to' parameter is not a valid address`)) {
            error.message = 'Recipient is not a valid address';
        } else {
            error.message = `Email failed to send "${error.originalMessage}" - please verify your email settings`;
        }

        this.error = error;
    }
}

/**
 * An email address
 * @typedef { string } EmailAddress
 */

/**
 * An object representing an email to send
 * @typedef { Object } Email
 * @property { string } html - The html content of the email
 * @property { string } subject - The subject of the email
 */

module.exports = {
    BATCH_SIZE,
    SuccessfulBatch,
    FailedBatch,

    // accepts an ID rather than an Email model to better support running via a job queue
    async processEmail({emailId, options}) {
        const knexOptions = _.pick(options, ['transacting', 'forUpdate']);
        const emailModel = await models.Email.findOne({id: emailId}, knexOptions);

        if (!emailModel) {
            throw new errors.IncorrectUsageError({
                message: 'Provided email id does not match a known email record',
                context: {
                    id: emailId
                }
            });
        }

        if (emailModel.get('status') !== 'pending') {
            throw new errors.IncorrectUsageError({
                message: 'Emails can only be processed when in the "pending" state',
                context: `Email "${emailId}" has state "${emailModel.get('status')}"`,
                code: 'EMAIL_NOT_PENDING'
            });
        }

        await emailModel.save({status: 'submitting'}, Object.assign({}, knexOptions, {patch: true}));

        // get batch IDs via knex to avoid model instantiation
        // only fetch pending or failed batches to avoid re-sending previously sent emails
        const batchIds = await models.EmailBatch
            .getFilteredCollectionQuery({filter: `email_id:${emailId}+status:[pending,failed]`}, knexOptions)
            .select('id');

        const batchResults = await Promise.map(batchIds, async ({id: emailBatchId}) => {
            try {
                await this.processEmailBatch({emailBatchId, options});
                return new SuccessfulBatch(emailBatchId);
            } catch (error) {
                return new FailedBatch(emailBatchId, error);
            }
        }, {concurrency: 10});

        const successes = batchResults.filter(response => (response instanceof SuccessfulBatch));
        const failures = batchResults.filter(response => (response instanceof FailedBatch));
        const emailStatus = failures.length ? 'failed' : 'submitted';

        let error;

        if (failures.length) {
            error = failures[0].error.message;
        }

        if (error && error.length > 2000) {
            error = error.substring(0, 2000);
        }

        try {
            await models.Email.edit({
                status: emailStatus,
                results: JSON.stringify(successes),
                error: error,
                error_data: JSON.stringify(failures) // NOTE: need to discuss how we store this
            }, {
                id: emailModel.id
            });
        } catch (err) {
            logging.error(err);
        }

        return batchResults;
    },

    // accepts an ID rather than an EmailBatch model to better support running via a job queue
    async processEmailBatch({emailBatchId, options}) {
        const knexOptions = _.pick(options, ['transacting', 'forUpdate']);

        const emailBatchModel = await models.EmailBatch
            .findOne({id: emailBatchId}, Object.assign({}, knexOptions, {withRelated: 'email'}));

        if (!emailBatchModel) {
            throw new errors.IncorrectUsageError({
                message: 'Provided email_batch id does not match a known email_batch record',
                context: {
                    id: emailBatchId
                }
            });
        }

        if (!['pending','failed'].includes(emailBatchModel.get('status'))) {
            throw new errors.IncorrectUsageError({
                message: 'Email batches can only be processed when in the "pending" or "failed" state',
                context: `Email batch "${emailBatchId}" has state "${emailBatchModel.get('status')}"`
            });
        }

        // get recipient rows via knex to avoid costly bookshelf model instantiation
        const recipientRows = await models.EmailRecipient
            .getFilteredCollectionQuery({filter: `batch_id:${emailBatchId}`});

        await emailBatchModel.save({status: 'submitting'}, knexOptions);

        try {
            // send the email
            const sendResponse = await this.send(emailBatchModel.relations.email.toJSON(), recipientRows);

            // update batch success status
            return await emailBatchModel.save({
                status: 'submitted',
                provider_id: sendResponse.id
            }, Object.assign({}, knexOptions, {patch: true}));
        } catch (error) {
            // update batch failed status
            await emailBatchModel.save({status: 'failed'}, knexOptions);

            // log any error that didn't come from the provider which would have already logged it
            if (!error.code || error.code !== 'BULK_EMAIL_SEND_FAILED') {
                let ghostError = new errors.InternalServerError({
                    err: error
                });
                sentry.captureException(ghostError);
                logging.error(ghostError);
                throw ghostError;
            }

            throw error;
        } finally {
            // update all email recipients with a processed_at
            await models.EmailRecipient
                .where({batch_id: emailBatchId})
                .save({processed_at: moment()}, Object.assign({}, knexOptions, {patch: true}));
        }
    },

    /**
     * @param {Email-like} emailData - The email to send, must be a POJO so emailModel.toJSON() before calling if needed
     * @param {[EmailRecipient]} recipients - The recipients to send the email to with their associated data
     * @returns {Object} - {providerId: 'xxx'}
     */
    send(emailData, recipients) {
        const mailgunInstance = mailgunProvider.getInstance();
        if (!mailgunInstance) {
            return;
        }

        const startTime = Date.now();
        debug(`sending message to ${recipients.length} recipients`);

        const replacements = postEmailSerializer.parseReplacements(emailData);

        // collate static and dynamic data for each recipient ready for provider
        const recipientData = {};
        recipients.forEach((recipient) => {
            // static data for every recipient
            const data = {
                unique_id: recipient.member_uuid,
                unsubscribe_url: postEmailSerializer.createUnsubscribeUrl(recipient.member_uuid)
            };

            // computed properties on recipients - TODO: better way of handling these
            recipient.member_first_name = (recipient.member_name || '').split(' ')[0];

            // dynamic data from replacements
            replacements.forEach(({id, recipientProperty, fallback}) => {
                data[id] = recipient[recipientProperty] || fallback || '';
            });

            recipientData[recipient.member_email] = data;
        });

        return mailgunProvider.send(emailData, recipientData, replacements).then((response) => {
            debug(`sent message (${Date.now() - startTime}ms)`);
            return response;
        }).catch((error) => {
            // REF: possible mailgun errors https://documentation.mailgun.com/en/latest/api-intro.html#errors
            let ghostError = new errors.EmailError({
                err: error,
                context: i18n.t('errors.services.mega.requestFailed.error'),
                code: 'BULK_EMAIL_SEND_FAILED'
            });

            sentry.captureException(ghostError);
            logging.warn(ghostError);

            debug(`failed to send message (${Date.now() - startTime}ms)`);
            throw ghostError;
        });
    }
};
