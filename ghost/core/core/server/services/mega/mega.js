const _ = require('lodash');
const Promise = require('bluebird');
const debug = require('@tryghost/debug')('mega');
const tpl = require('@tryghost/tpl');
const moment = require('moment');
const ObjectID = require('bson-objectid');
const errors = require('@tryghost/errors');
const logging = require('@tryghost/logging');
const settingsCache = require('../../../shared/settings-cache');
const membersService = require('../members');
const limitService = require('../limits');
const bulkEmailService = require('../bulk-email');
const jobsService = require('../jobs');
const db = require('../../data/db');
const models = require('../../models');
const postEmailSerializer = require('./post-email-serializer');
const {getSegmentsFromHtml} = require('./segment-parser');

// Used to listen to email.added and email.edited model events originally, I think to offload this - ideally would just use jobs now if possible
const events = require('../../lib/common/events');

const messages = {
    invalidSegment: 'Invalid segment value. Use one of the valid:"status:free" or "status:-free" values.',
    unexpectedFilterError: 'Unexpected {property} value "{value}", expected an NQL equivalent',
    noneFilterError: 'Cannot send email to "none" {property}',
    emailSendingDisabled: `Email sending is temporarily disabled because your account is currently in review. You should have an email about this from us already, but you can also reach us any time at support@ghost.org`,
    sendEmailRequestFailed: 'The email service was unable to send an email batch.',
    archivedNewsletterError: 'Cannot send email to archived newsletters',
    newsletterVisibilityError: 'Unexpected visibility value "{value}". Use one of the valid: "members", "paid".'
};

const getFromAddress = (senderName, fromAddress) => {
    if (/@localhost$/.test(fromAddress) || /@ghost.local$/.test(fromAddress)) {
        const localAddress = 'localhost@example.com';
        logging.warn(`Rewriting bulk email from address ${fromAddress} to ${localAddress}`);
        fromAddress = localAddress;
    }

    return senderName ? `"${senderName}"<${fromAddress}>` : fromAddress;
};

const getReplyToAddress = (fromAddress, replyAddressOption) => {
    const supportAddress = membersService.config.getEmailSupportAddress();

    return (replyAddressOption === 'support') ? supportAddress : fromAddress;
};

/**
 *
 * @param {Object} postModel - post model instance
 * @param {Object} options
 */
const getEmailData = async (postModel, options) => {
    let newsletter = await postModel.getLazyRelation('newsletter');
    if (!newsletter) {
        // The postModel doesn't have a newsletter in test emails
        newsletter = await models.Newsletter.getDefaultNewsletter();
    }
    const {subject, html, plaintext} = await postEmailSerializer.serialize(postModel, newsletter, options);

    let senderName = settingsCache.get('title') ? settingsCache.get('title').replace(/"/g, '\\"') : '';
    if (newsletter.get('sender_name')) {
        senderName = newsletter.get('sender_name');
    }

    let fromAddress = membersService.config.getEmailFromAddress();
    if (newsletter.get('sender_email')) {
        fromAddress = newsletter.get('sender_email');
    }

    return {
        subject,
        html,
        plaintext,
        from: getFromAddress(senderName, fromAddress),
        replyTo: getReplyToAddress(fromAddress, newsletter.get('sender_reply_to'))
    };
};

/**
 *
 * @param {Object} postModel - post model instance
 * @param {[string]} toEmails - member email addresses to send email to
 * @param {ValidMemberSegment} [memberSegment]
 */
const sendTestEmail = async (postModel, toEmails, memberSegment) => {
    let emailData = await getEmailData(postModel);
    emailData.subject = `[Test] ${emailData.subject}`;

    if (memberSegment) {
        emailData = postEmailSerializer.renderEmailForSegment(emailData, memberSegment);
    }
    // fetch any matching members so that replacements use expected values
    const recipients = await Promise.all(toEmails.map(async (email) => {
        const member = await membersService.api.members.get({email});
        if (member) {
            return {
                member_uuid: member.get('uuid'),
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

    if (response && response[0] && response[0].error) {
        return Promise.reject(new errors.EmailError({
            statusCode: response[0].error.statusCode,
            message: response[0].error.message,
            context: response[0].error.originalMessage
        }));
    }

    return response;
};

/**
 * transformRecipientFilter
 *
 * Accepts a filter string, errors on unexpected legacy filter syntax and enforces subscribed:true
 *
 * @param {Object} newsletter
 * @param {string} emailRecipientFilter NQL filter for members
 * @param {string} errorProperty
 */
const transformEmailRecipientFilter = (newsletter, emailRecipientFilter, errorProperty) => {
    const filter = [`newsletters.id:${newsletter.id}`];

    switch (emailRecipientFilter) {
    case 'all':
        break;
    case 'none':
        throw new errors.InternalServerError({
            message: tpl(messages.noneFilterError, {
                property: errorProperty
            })
        });
    default:
        filter.push(`(${emailRecipientFilter})`);
        break;
    }

    const visibility = newsletter.get('visibility');
    switch (visibility) {
    case 'members':
        // No need to add a member status filter as the email is available to all members
        break;
    case 'paid':
        filter.push(`status:-free`);
        break;
    default:
        throw new errors.InternalServerError({
            message: tpl(messages.newsletterVisibilityError, {
                value: visibility
            })
        });
    }

    return filter.join('+');
};

/**
 * addEmail
 *
 * Accepts a post model and creates an email record based on it. Only creates one
 * record per post
 *
 * @param {object} postModel Post Model Object
 * @param {object} options
 */

const addEmail = async (postModel, options) => {
    if (limitService.isLimited('emails')) {
        await limitService.errorIfWouldGoOverLimit('emails');
    }

    if (settingsCache.get('email_verification_required') === true) {
        throw new errors.HostLimitError({
            message: tpl(messages.emailSendingDisabled)
        });
    }

    const knexOptions = _.pick(options, ['transacting', 'forUpdate']);
    const filterOptions = {...knexOptions, limit: 1};
    const sharedOptions = _.pick(options, ['transacting']);
    const newsletter = await postModel.getLazyRelation('newsletter', {require: true, ...sharedOptions});

    if (newsletter.get('status') !== 'active') {
        // A post might have been scheduled to an archived newsletter.
        // Don't send it (people can't unsubscribe any longer).
        throw new errors.EmailError({
            message: tpl(messages.archivedNewsletterError)
        });
    }

    const emailRecipientFilter = postModel.get('email_recipient_filter');
    filterOptions.filter = transformEmailRecipientFilter(newsletter, emailRecipientFilter, 'email_segment');

    const startRetrieve = Date.now();
    debug('addEmail: retrieving members count');
    const {meta: {pagination: {total: membersCount}}} = await membersService.api.members.list({...knexOptions, ...filterOptions});
    debug(`addEmail: retrieved members count - ${membersCount} members (${Date.now() - startRetrieve}ms)`);

    // NOTE: don't create email object when there's nobody to send the email to
    if (membersCount === 0) {
        return null;
    }

    if (limitService.isLimited('emails')) {
        await limitService.errorIfWouldGoOverLimit('emails', {addedCount: membersCount});
    }

    const postId = postModel.get('id');
    const existing = await models.Email.findOne({post_id: postId}, knexOptions);

    if (!existing) {
        // get email contents and perform replacements using no member data so
        // we have a decent snapshot of email content for later display
        const emailData = await getEmailData(postModel, options);

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
            recipient_filter: emailRecipientFilter,
            newsletter_id: newsletter.id
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

    // @TODO move this into the jobService
    if (!process.env.NODE_ENV.startsWith('test')) {
        return jobsService.addJob({
            job: sendEmailJob,
            data: {emailModel},
            offloaded: false
        });
    }
}

async function sendEmailJob({emailModel, options}) {
    let startEmailSend = null;

    try {
        // Check host limit for allowed member count and throw error if over limit
        // - do this even if it's a retry so that there's no way around the limit
        if (limitService.isLimited('members')) {
            await limitService.errorIfIsOverLimit('members');
        }

        // Check host limit for disabled emails or going over emails limit
        if (limitService.isLimited('emails')) {
            await limitService.errorIfWouldGoOverLimit('emails');
        }

        // Create email batch and recipient rows unless this is a retry and they already exist
        const existingBatchCount = await emailModel.related('emailBatches').count('id');

        if (existingBatchCount === 0) {
            let newBatchCount;

            await models.Base.transaction(async (transacting) => {
                newBatchCount = await createSegmentedEmailBatches({emailModel, options: {transacting}});
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

        throw new errors.InternalServerError({
            err: error,
            context: tpl(messages.sendEmailRequestFailed)
        });
    }
}

/**
 * Fetch rows of members that should receive an email.
 * Uses knex directly rather than bookshelf to avoid thousands of bookshelf model
 * instantiations and associated processing and event loop blocking
 *
 * @param {Object} options
 * @param {Object} options.emailModel - instance of Email model
 * @param {string} [options.memberSegment] - NQL filter to apply in addition to the one defined in emailModel
 * @param {Object} options.options - knex options
 *
 * @returns {Promise<Object[]>} instances of filtered knex member rows
 */
async function getEmailMemberRows({emailModel, memberSegment, options}) {
    const knexOptions = _.pick(options, ['transacting', 'forUpdate']);
    const sharedOptions = _.pick(options, ['transacting']);
    const filterOptions = Object.assign({}, knexOptions);

    const newsletter = await emailModel.getLazyRelation('newsletter', {require: true, ...sharedOptions});
    const recipientFilter = transformEmailRecipientFilter(newsletter, emailModel.get('recipient_filter'), 'recipient_filter');
    filterOptions.filter = recipientFilter;

    if (memberSegment) {
        filterOptions.filter = `${filterOptions.filter}+${memberSegment}`;
    }

    const startRetrieve = Date.now();
    debug('getEmailMemberRows: retrieving members list');
    // select('members.*') is necessary here to avoid duplicate `email` columns in the result set
    // without it we do `select *` which pulls in the Stripe customer email too which overrides the member email
    const memberRows = await models.Member.getFilteredCollectionQuery(filterOptions).select('members.*').distinct();
    debug(`getEmailMemberRows: retrieved members list - ${memberRows.length} members (${Date.now() - startRetrieve}ms)`);

    return memberRows;
}

/**
 * Partitions array of member records according to the segment they belong to
 *
 * @param {Object[]} memberRows raw member rows to partition
 * @param {string[]} segments segment filters to partition batches by
 *
 * @returns {Object} partitioned memberRows with keys that correspond segment names
 */
function partitionMembersBySegment(memberRows, segments) {
    const partitions = {};

    for (const memberSegment of segments) {
        let segmentedMemberRows;

        // NOTE: because we only support two types of segments at the moment the logic was kept dead simple
        //       in the future this segmentation should probably be substituted with NQL:
        //       memberRows.filter(member => nql(memberSegment).queryJSON(member));
        if (memberSegment === 'status:free') {
            segmentedMemberRows = memberRows.filter(member => member.status === 'free');
            memberRows = memberRows.filter(member => member.status !== 'free');
        } else if (memberSegment === 'status:-free') {
            segmentedMemberRows = memberRows.filter(member => member.status !== 'free');
            memberRows = memberRows.filter(member => member.status === 'free');
        } else {
            throw new errors.ValidationError({
                message: tpl(messages.invalidSegment)
            });
        }

        partitions[memberSegment] = segmentedMemberRows;
    }

    if (memberRows.length) {
        partitions.unsegmented = memberRows;
    }

    return partitions;
}

/**
 * Detects segment filters in emailModel's html and creates separate batches per segment
 *
 * @param {Object} options
 * @param {Object} options.emailModel - instance of Email model
 * @param {Object} options.options - knex options
 */
async function createSegmentedEmailBatches({emailModel, options}) {
    let memberRows = await getEmailMemberRows({emailModel, options});

    if (!memberRows.length) {
        return [];
    }

    const segments = getSegmentsFromHtml(emailModel.get('html'));
    const batchIds = [];

    if (segments.length) {
        const partitionedMembers = partitionMembersBySegment(memberRows, segments);

        for (const partition in partitionedMembers) {
            const emailBatchIds = await createEmailBatches({
                emailModel,
                memberRows: partitionedMembers[partition],
                memberSegment: partition === 'unsegmented' ? null : partition,
                options
            });
            batchIds.push(emailBatchIds);
        }
    } else {
        const emailBatchIds = await createEmailBatches({emailModel, memberRows, options});
        batchIds.push(emailBatchIds);
    }

    return batchIds;
}

/**
 * Store email_batch and email_recipient records for an email.
 * Uses knex directly rather than bookshelf to avoid thousands of bookshelf model
 * instantiations and associated processing and event loop blocking.
 *
 * @param {Object} options
 * @param {Object} options.emailModel - instance of Email model
 * @param {string} [options.memberSegment] - NQL filter to apply in addition to the one defined in emailModel
 * @param {Object[]} [options.memberRows] - member rows to be batched
 * @param {Object} options.options - knex options
 * @returns {Promise<string[]>} - created batch ids
 */
async function createEmailBatches({emailModel, memberRows, memberSegment, options}) {
    const storeRecipientBatch = async function (recipients) {
        const knexOptions = _.pick(options, ['transacting', 'forUpdate']);
        const batchModel = await models.EmailBatch.add({
            email_id: emailModel.id,
            member_segment: memberSegment
        }, knexOptions);

        const recipientData = [];

        recipients.forEach((memberRow) => {
            if (!memberRow.id || !memberRow.uuid || !memberRow.email) {
                logging.warn(`Member row not included as email recipient due to missing data - id: ${memberRow.id}, uuid: ${memberRow.uuid}, email: ${memberRow.email}`);
                return;
            }

            recipientData.push({
                id: ObjectID().toHexString(),
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
    // NOTE: below are only exposed for testing purposes
    _transformEmailRecipientFilter: transformEmailRecipientFilter,
    _partitionMembersBySegment: partitionMembersBySegment,
    _getEmailMemberRows: getEmailMemberRows,
    _getFromAddress: getFromAddress,
    _getReplyToAddress: getReplyToAddress,
    _sendEmailJob: sendEmailJob
};

/**
 * @typedef {'status:free' | 'status:-free'} ValidMemberSegment
 */
