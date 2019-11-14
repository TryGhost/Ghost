const url = require('url');
const moment = require('moment');
const common = require('../../lib/common');
const api = require('../../api');
const membersService = require('../members');
const bulkEmailService = require('../bulk-email');
const models = require('../../models');
const postEmailSerializer = require('./post-email-serializer');
const urlUtils = require('../../lib/url-utils');

const getEmailData = (post, members = []) => {
    const emailTmpl = postEmailSerializer.serialize(post);
    emailTmpl.from = membersService.config.getEmailFromAddress();

    const membersToSendTo = members.filter((member) => {
        return membersService.contentGating.checkPostAccess(post, member);
    });
    const emails = membersToSendTo.map(member => member.email);
    const emailData = membersToSendTo.reduce((emailData, member) => {
        return Object.assign({
            [member.email]: {
                unique_id: member.uuid,
                unsubscribe_url: createUnsubscribeUrl(member)
            }
        }, emailData);
    }, {});

    return {emailTmpl, emails, emailData};
};

const sendEmail = async (post, members) => {
    const {emailTmpl, emails, emailData} = getEmailData(post, members);

    return bulkEmailService.send(emailTmpl, emails, emailData);
};

const sendTestEmail = async (post, emails) => {
    const {emailTmpl} = getEmailData(post);
    const emailData = emails.reduce((emailData, email) => {
        return Object.assign({
            [email]: {
                unique_id: '',
                unsubscribe_url: ''
            }
        }, emailData);
    }, {});
    emailTmpl.subject = `${emailTmpl.subject} [Test]`;
    return bulkEmailService.send(emailTmpl, emails, emailData);
};

/**
 * addEmail
 *
 * Accepts a post object and creates an email record based on it. Only creates one
 * record per post
 *
 * @param {object} post JSON object
 */
const addEmail = async (post) => {
    const {members} = await membersService.api.members.list(Object.assign({filter: 'subscribed:true'}, {limit: 'all'}));
    const {emailTmpl, emails} = getEmailData(post, members);

    // NOTE: don't create email object when there's nobody to send the email to
    if (!emails.length) {
        return null;
    }

    const existing = await models.Email.findOne({post_id: post.id});

    if (!existing) {
        return models.Email.add({
            post_id: post.id,
            status: 'pending',
            email_count: emails.length,
            subject: emailTmpl.subject,
            html: emailTmpl.html,
            plaintext: emailTmpl.plaintext,
            submitted_at: moment().toDate()
        });
    } else {
        return existing;
    }
};

// NOTE: serialization is needed to make sure we are using current API and do post transformations
//       such as image URL transformation from relative to absolute
const serialize = async (model) => {
    const frame = {options: {context: {user: true}}};
    const apiVersion = model.get('api_version') || 'v3';
    const docName = 'posts';

    await api.shared
        .serializers
        .handle
        .output(model, {docName: docName, method: 'read'}, api[apiVersion].serializers.output, frame);

    return frame.response[docName][0];
};

/**
 * createUnsubscribeUrl
 *
 * Takes a member and returns the url that should be used to unsubscribe
 *
 * @param {object} member
 * @param {string} member.uuid
 */
function createUnsubscribeUrl(member) {
    const siteUrl = urlUtils.getSiteUrl();
    const unsubscribeUrl = new URL(siteUrl);
    unsubscribeUrl.searchParams.set('action', 'unsubscribe');
    unsubscribeUrl.searchParams.set('unsubscribe', member.uuid);

    return unsubscribeUrl.href;
}

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
            message: 'Expected unsubscribe param containing token'
        });
    }

    const {query} = url.parse(req.url, true);
    if (!query || !query.unsubscribe) {
        throw new common.errors.BadRequestError({
            message: 'Expected unsubscribe param containing token'
        });
    }

    const member = await membersService.api.members.get({
        uuid: query.unsubscribe
    });

    if (!member) {
        throw new common.errors.BadRequestError({
            message: 'Expected valid subscribe param - could not find member'
        });
    }

    try {
        await membersService.api.members.update({subscribed: false}, {id: member.id});
    } catch (err) {
        throw new common.errors.InternalServerError({
            message: 'Failed to unsubscribe member'
        });
    }
}

async function listener(emailModel, options) {
    // CASE: do not send email if we import a database
    // TODO: refactor post.published events to never fire on importing
    if (options && options.importing) {
        return;
    }
    const postModel = await models.Post.findOne({id: emailModel.get('post_id')}, {withRelated: ['authors']});

    const post = await serialize(postModel);

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

    let meta;
    let error;

    try {
        // NOTE: meta can contains an array which can be a mix of successful and error responses
        //       needs filtering and saving objects of {error, batchData} form to separate property
        meta = await sendEmail(post, members);
    } catch (err) {
        // NOTE: need to add some check here to only save non-generic/readable errors
        error = err;
    }

    await models.Email.edit({
        status: 'submitted',
        meta: JSON.stringify(meta),
        error: error
    }, {
        id: emailModel.id
    });
}

function listen() {
    common.events.on('email.added', listener);
}

// Public API
module.exports = {
    listen,
    addEmail,
    sendTestEmail,
    handleUnsubscribeRequest,
    createUnsubscribeUrl
};
