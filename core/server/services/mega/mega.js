const _ = require('lodash');
const url = require('url');
const moment = require('moment');
const common = require('../../lib/common');
const membersService = require('../members');
const bulkEmailService = require('../bulk-email');
const models = require('../../models');
const postEmailSerializer = require('./post-email-serializer');

const getEmailData = async (postModel, recipients = []) => {
    const emailTmpl = await postEmailSerializer.serialize(postModel);
    emailTmpl.from = membersService.config.getEmailFromAddress();

    const emails = recipients.map(recipient => recipient.email);
    const emailData = recipients.reduce((emailData, recipient) => {
        return Object.assign({
            [recipient.email]: {
                unique_id: recipient.uuid,
                unsubscribe_url: postEmailSerializer.createUnsubscribeUrl(recipient.uuid)
            }
        }, emailData);
    }, {});

    return {emailTmpl, emails, emailData};
};

const sendEmail = async (postModel, members) => {
    const membersToSendTo = members.filter((member) => {
        return membersService.contentGating.checkPostAccess(postModel.toJSON(), member);
    });

    const {emailTmpl, emails, emailData} = await getEmailData(postModel, membersToSendTo);

    return bulkEmailService.send(emailTmpl, emails, emailData);
};

const sendTestEmail = async (postModel, toEmails) => {
    const recipients = toEmails.map((email) => {
        return {email};
    });
    const {emailTmpl, emails, emailData} = await getEmailData(postModel, recipients);
    emailTmpl.subject = `[Test] ${emailTmpl.subject}`;
    return bulkEmailService.send(emailTmpl, emails, emailData);
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

    const {members} = await membersService.api.members.list(Object.assign(knexOptions, {filter: 'subscribed:true'}, {limit: 'all'}));
    const {emailTmpl, emails} = await getEmailData(postModel, members);

    // NOTE: don't create email object when there's nobody to send the email to
    if (!emails.length) {
        return null;
    }

    const postId = postModel.get('id');
    const existing = await models.Email.findOne({post_id: postId}, knexOptions);

    if (!existing) {
        return models.Email.add({
            post_id: postId,
            status: 'pending',
            email_count: emails.length,
            subject: emailTmpl.subject,
            html: emailTmpl.html,
            plaintext: emailTmpl.plaintext,
            submitted_at: moment().toDate()
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
 * @param {object} model Email model
 */
const retryFailedEmail = async (model) => {
    return await models.Email.edit({
        status: 'pending'
    }, {
        id: model.get('id')
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
        throw new common.errors.BadRequestError({
            message: 'Unsubscribe failed! Could not find member'
        });
    }

    const {query} = url.parse(req.url, true);
    if (!query || !query.uuid) {
        throw new common.errors.BadRequestError({
            message: (query.preview ? 'Unsubscribe preview' : 'Unsubscribe failed! Could not find member')
        });
    }

    const member = await membersService.api.members.get({
        uuid: query.uuid
    });

    if (!member) {
        throw new common.errors.BadRequestError({
            message: 'Unsubscribe failed! Could not find member'
        });
    }

    try {
        return await membersService.api.members.update({subscribed: false}, {id: member.id});
    } catch (err) {
        throw new common.errors.InternalServerError({
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
    const postModel = await models.Post.findOne({id: emailModel.get('post_id')}, {withRelated: ['authors']});

    if (emailModel.get('status') !== 'pending') {
        return;
    }

    const {members} = await membersService.api.members.list(Object.assign({filter: 'subscribed:true'}, {limit: 'all'}));

    if (!members.length) {
        return;
    }

    await models.Email.edit({
        status: 'submitting'
    }, {
        id: emailModel.id
    });

    let meta = [];
    let error = null;

    try {
        // NOTE: meta can contains an array which can be a mix of successful and error responses
        //       needs filtering and saving objects of {error, batchData} form to separate property
        meta = await sendEmail(postModel, members);
    } catch (err) {
        common.logging.error(new common.errors.GhostError({
            err: err,
            context: common.i18n.t('errors.services.mega.requestFailed.error')
        }));
        error = err.message;
    }

    const successes = meta.filter(response => (response instanceof bulkEmailService.SuccessfulBatch));
    const failures = meta.filter(response => (response instanceof bulkEmailService.FailedBatch));
    const batchStatus = successes.length ? 'submitted' : 'failed';

    if (!error && failures.length) {
        error = failures[0].error.message;
    }

    if (error && error.length > 2000) {
        error = error.substring(0, 2000);
    }

    try {
        // CASE: the batch partially succeeded
        await models.Email.edit({
            status: batchStatus,
            meta: JSON.stringify(successes),
            error: error,
            error_data: JSON.stringify(failures) // NOTE:need to discuss how we store this
        }, {
            id: emailModel.id
        });
    } catch (err) {
        common.logging.error(err);
    }
}

const statusChangedHandler = (emailModel, options) => {
    const emailRetried = emailModel.wasChanged() && (emailModel.get('status') === 'pending') && (emailModel.previous('status') === 'failed');

    if (emailRetried) {
        pendingEmailHandler(emailModel, options);
    }
};

function listen() {
    common.events.on('email.added', pendingEmailHandler);
    common.events.on('email.edited', statusChangedHandler);
}

// Public API
module.exports = {
    listen,
    addEmail,
    retryFailedEmail,
    sendTestEmail,
    handleUnsubscribeRequest
};
