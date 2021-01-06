const _ = require('lodash');
const Promise = require('bluebird');
const debug = require('ghost-ignition').debug('mega');
const url = require('url');
const moment = require('moment');
const ObjectID = require('bson-objectid');
const errors = require('@tryghost/errors');
const {events, i18n} = require('../../lib/common');
const logging = require('../../../shared/logging');
const settingsCache = require('../settings/cache');
const membersService = require('../members');
const bulkEmailService = require('../bulk-email');
const jobsService = require('../jobs');
const db = require('../../data/db');
const models = require('../../models');
const postEmailSerializer = require('./post-email-serializer');

const getFromAddress = () => {
    let fromAddress = membersService.config.getEmailFromAddress();

    if (/@localhost$/.test(fromAddress) || /@ghost.local$/.test(fromAddress)) {
        const localAddress = 'localhost@example.com';
        logging.warn(`Rewriting bulk email from address ${fromAddress} to ${localAddress}`);
        fromAddress = localAddress;
    }

    const siteTitle = settingsCache.get('title') ? settingsCache.get('title').replace(/"/g, '\\"') : '';

    return siteTitle ? `"${siteTitle}"<${fromAddress}>` : fromAddress;
};

const getReplyToAddress = () => {
    const fromAddress = membersService.config.getEmailFromAddress();
    const supportAddress = membersService.config.getEmailSupportAddress();
    const replyAddressOption = settingsCache.get('members_reply_address');

    return (replyAddressOption === 'support') ? supportAddress : fromAddress;
};

const getEmailData = async (postModel, options) => {
    const {subject, html, plaintext} = await postEmailSerializer.serialize(postModel, options);

    return {
        subject,
        html,
        plaintext,
        from: getFromAddress(),
        replyTo: getReplyToAddress()
    };
};

const sendTestEmail = async (postModel, toEmails) => {
    const emailData = await getEmailData(postModel);
    emailData.subject = `[Test] ${emailData.subject}`;

    // fetch any matching members so that replacements use expected values
    const recipients = await Promise.all(toEmails.map(async (email) => {
        const member = await membersService.api.members.get({email});
        if (member) {
            return {
                member_uuid: member.get('id'),
                member_email: member.get('email'),
                member_name: member.get('name')
            };
        }

        return {
            member_email: email
        };
    }));

    // enable tracking for previews to match real-world behaviour
    emailData.track_opens = !!settingsCache.get('email_track_opens');

    const response = await bulkEmailService.send(emailData, recipients);

    if (response instanceof bulkEmailService.FailedBatch) {
        return Promise.reject(response.error);
    }

    return response;
};

/**
 * addEmail
 *
 * Accepts a post model and creates an email record based on it. Only creates one
 * record per post
 *
 * @param {object} postModel Post Model Object
 */

const addEmail = async (postModel, options) => {
    const knexOptions = _.pick(options, ['transacting', 'forUpdate']);
    const filterOptions = Object.assign({}, knexOptions, {filter: 'subscribed:true', limit: 1});

    const emailRecipientFilter = postModel.get('email_recipient_filter');

    switch (emailRecipientFilter) {
    case 'paid':
        filterOptions.paid = true;
        break;
    case 'free':
        filterOptions.paid = false;
        break;
    case 'all':
        break;
    case 'none':
        throw new Error('Cannot sent email to "none" email_recipient_filter');
    default:
        throw new Error(`Unknown email_recipient_filter ${emailRecipientFilter}`);
    }

    const startRetrieve = Date.now();
    debug('addEmail: retrieving members count');
    const {meta: {pagination: {total: membersCount}}} = await membersService.api.members.list(Object.assign({}, knexOptions, filterOptions));
    debug(`addEmail: retrieved members count - ${membersCount} members (${Date.now() - startRetrieve}ms)`);

    // NOTE: don't create email object when there's nobody to send the email to
    if (membersCount === 0) {
        return null;
    }

    const postId = postModel.get('id');
    const existing = await models.Email.findOne({post_id: postId}, knexOptions);

    if (!existing) {
        // get email contents and perform replacements using no member data so
        // we have a decent snapshot of email content for later display
        const emailData = await getEmailData(postModel);

        return models.Email.add({
            post_id: postId,
            status: 'pending',
            email_count: membersCount,
            subject: emailData.subject,
            from: emailData.from,
            reply_to: emailData.replyTo,
            html: emailData.html,
            plaintext: emailData.plaintext,
            submitted_at: moment().toDate(),
            track_opens: !!settingsCache.get('email_track_opens'),
            recipient_filter: emailRecipientFilter
        }, knexOptions);
    } else {
        return existing;
    }
};

/**
 * retryFailedEmail
 *
 * Accepts an Email model and resets it's fields to trigger retry listeners
 *
 * @param {Email} emailModel Email model
 */
const retryFailedEmail = async (emailModel) => {
    return await models.Email.edit({
        status: 'pending'
    }, {
        id: emailModel.get('id')
    });
};

/**
 * handleUnsubscribeRequest
 *
 * Takes a request/response pair and reads the `unsubscribe` query parameter,
 * using the content to update the members service to set the `subscribed` flag
 * to false on the member
 *
 * If any operation fails, or the request is invalid the function will error - so using
 * as middleware should consider wrapping with `try/catch`
 *
 * @param {Request} req
 * @returns {Promise<void>}
 */
async function handleUnsubscribeRequest(req) {
    if (!req.url) {
        throw new errors.BadRequestError({
            message: 'Unsubscribe failed! Could not find member'
        });
    }

    const {query} = url.parse(req.url, true);
    if (!query || !query.uuid) {
        throw new errors.BadRequestError({
            message: (query.preview ? 'Unsubscribe preview' : 'Unsubscribe failed! Could not find member')
        });
    }

    const member = await membersService.api.members.get({
        uuid: query.uuid
    });

    if (!member) {
        throw new errors.BadRequestError({
            message: 'Unsubscribe failed! Could not find member'
        });
    }

    try {
        const memberModel = await membersService.api.members.update({subscribed: false}, {id: member.id});
        return memberModel.toJSON();
    } catch (err) {
        throw new errors.InternalServerError({
            err,
            message: 'Failed to unsubscribe member'
        });
    }
}

async function pendingEmailHandler(emailModel, options) {
    // CASE: do not send email if we import a database
    // TODO: refactor post.published events to never fire on importing
    if (options && options.importing) {
        return;
    }

    if (emailModel.get('status') !== 'pending') {
        return;
    }

    // make sure recurring background analytics jobs are running once we have emails
    const emailAnalyticsJobs = require('../email-analytics/jobs');
    emailAnalyticsJobs.scheduleRecurringJobs();

    return jobsService.addJob({
        job: sendEmailJob,
        data: {emailModel},
        offloaded: false
    });
}

async function sendEmailJob({emailModel, options}) {
    let startEmailSend = null;

    try {
        // Check host limit for allowed member count and throw error if over limit
        // - do this even if it's a retry so that there's no way around the limit
        await membersService.checkHostLimit();

        // Create email batch and recipient rows unless this is a retry and they already exist
        const existingBatchCount = await emailModel.related('emailBatches').count('id');

        if (existingBatchCount === 0) {
            let newBatchCount;

            await models.Base.transaction(async (transacting) => {
                newBatchCount = await createEmailBatches({emailModel, options: {transacting}});
            });

            if (newBatchCount === 0) {
                return;
            }
        }

        debug('sendEmailJob: sending email');
        startEmailSend = Date.now();
        await bulkEmailService.processEmail({emailId: emailModel.get('id'), options});
        debug(`sendEmailJob: sent email (${Date.now() - startEmailSend}ms)`);
    } catch (error) {
        if (startEmailSend) {
            debug(`sendEmailJob: send email failed (${Date.now() - startEmailSend}ms)`);
        }

        let errorMessage = error.message;
        if (errorMessage.length > 2000) {
            errorMessage = errorMessage.substring(0, 2000);
        }

        await emailModel.save({
            status: 'failed',
            error: errorMessage
        }, {patch: true});

        throw new errors.GhostError({
            err: error,
            context: i18n.t('errors.services.mega.requestFailed.error')
        });
    }
}

// Fetch rows of members that should receive an email.
// Uses knex directly rather than bookshelf to avoid thousands of bookshelf model
// instantiations and associated processing and event loop blocking
async function getEmailMemberRows({emailModel, options}) {
    const knexOptions = _.pick(options, ['transacting', 'forUpdate']);

    // TODO: this will clobber a user-assigned filter if/when we allow emails to be sent to filtered member lists
    const filterOptions = Object.assign({}, knexOptions, {filter: 'subscribed:true'});

    const recipientFilter = emailModel.get('recipient_filter');

    switch (recipientFilter) {
    case 'paid':
        filterOptions.paid = true;
        break;
    case 'free':
        filterOptions.paid = false;
        break;
    case 'all':
        break;
    default:
        throw new Error(`Unknown recipient_filter ${recipientFilter}`);
    }

    const startRetrieve = Date.now();
    debug('getEmailMemberRows: retrieving members list');
    // select('members.*') is necessary here to avoid duplicate `email` columns in the result set
    // without it we do `select *` which pulls in the Stripe customer email too which overrides the member email
    const memberRows = await models.Member.getFilteredCollectionQuery(filterOptions).select('members.*').distinct();
    debug(`getEmailMemberRows: retrieved members list - ${memberRows.length} members (${Date.now() - startRetrieve}ms)`);

    return memberRows;
}

// Store email_batch and email_recipient records for an email.
// Uses knex directly rather than bookshelf to avoid thousands of bookshelf model
// instantiations and associated processing and event loop blocking.
// Returns array of batch ids
async function createEmailBatches({emailModel, options}) {
    const memberRows = await getEmailMemberRows({emailModel, options});

    if (!memberRows.length) {
        return [];
    }

    const storeRecipientBatch = async function (recipients) {
        const knexOptions = _.pick(options, ['transacting', 'forUpdate']);
        const batchModel = await models.EmailBatch.add({email_id: emailModel.id}, knexOptions);

        const recipientData = [];

        recipients.forEach((memberRow) => {
            if (!memberRow.id || !memberRow.uuid || !memberRow.email) {
                logging.warn(`Member row not included as email recipient due to missing data - id: ${memberRow.id}, uuid: ${memberRow.uuid}, email: ${memberRow.email}`);
                return;
            }

            recipientData.push({
                id: ObjectID.generate(),
                email_id: emailModel.id,
                member_id: memberRow.id,
                batch_id: batchModel.id,
                member_uuid: memberRow.uuid,
                member_email: memberRow.email,
                member_name: memberRow.name
            });
        });

        const insertQuery = db.knex('email_recipients').insert(recipientData);

        if (knexOptions.transacting) {
            insertQuery.transacting(knexOptions.transacting);
        }

        await insertQuery;

        return batchModel.id;
    };

    debug('createEmailBatches: storing recipient list');
    const startOfRecipientStorage = Date.now();
    const batches = _.chunk(memberRows, bulkEmailService.BATCH_SIZE);
    const batchIds = await Promise.mapSeries(batches, storeRecipientBatch);
    debug(`createEmailBatches: stored recipient list (${Date.now() - startOfRecipientStorage}ms)`);

    return batchIds;
}

const statusChangedHandler = (emailModel, options) => {
    const emailRetried = emailModel.wasChanged()
        && emailModel.get('status') === 'pending'
        && emailModel.previous('status') === 'failed';

    if (emailRetried) {
        pendingEmailHandler(emailModel, options);
    }
};

function listen() {
    events.on('email.added', pendingEmailHandler);
    events.on('email.edited', statusChangedHandler);
}

// Public API
module.exports = {
    listen,
    addEmail,
    retryFailedEmail,
    sendTestEmail,
    handleUnsubscribeRequest
};
