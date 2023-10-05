const {fixtureManager, mockManager} = require('./e2e-framework');
const moment = require('moment');
const ObjectId = require('bson-objectid').default;
const models = require('../../core/server/models');
const sinon = require('sinon');
const jobManager = require('../../core/server/services/jobs/job-service');
const escapeRegExp = require('lodash/escapeRegExp');
const should = require('should');
const assert = require('assert/strict');

const getDefaultNewsletter = async function () {
    const newsletterSlug = fixtureManager.get('newsletters', 0).slug;
    return await models.Newsletter.findOne({slug: newsletterSlug});
};

let postCounter = 0;

async function createPublishedPostEmail(agent, settings = {}, email_recipient_filter) {
    const post = {
        title: 'A random test post',
        status: 'draft',
        feature_image_alt: 'Testing sending',
        feature_image_caption: 'Testing <b>feature image caption</b>',
        created_at: moment().subtract(2, 'days').toISOString(),
        updated_at: moment().subtract(2, 'days').toISOString(),
        created_by: ObjectId().toHexString(),
        updated_by: ObjectId().toHexString(),
        ...settings
    };

    const res = await agent.post('posts/')
        .body({posts: [post]})
        .expectStatus(201);
        
    const id = res.body.posts[0].id;

    // Make sure all posts are published in the samre order, with minimum 1s difference (to have consistent ordering when including latests posts)
    postCounter += 1;

    const updatedPost = {
        status: 'published',
        updated_at: res.body.posts[0].updated_at,
        // Fixed publish date to make sure snapshots are consistent
        published_at: moment(new Date(2050, 0, 1, 12, 0, postCounter)).toISOString()
    };

    const newsletterSlug = fixtureManager.get('newsletters', 0).slug;
    await agent.put(`posts/${id}/?newsletter=${newsletterSlug}${email_recipient_filter ? `&email_segment=${email_recipient_filter}` : ''}`)
        .body({posts: [updatedPost]})
        .expectStatus(200);

    const emailModel = await models.Email.findOne({
        post_id: id
    });
    assert(!!emailModel);

    return emailModel;
}
let lastEmailModel;

/**
 * @typedef {{html: string, plaintext: string, emailModel: any, recipientData: any}} SendEmail
 */

/**
 * Try sending an email, and assert that it succeeded
 * @returns {Promise<SendEmail>}
 */
async function sendEmail(agent, settings, email_recipient_filter) {
    // Prepare a post and email model
    const completedPromise = jobManager.awaitCompletion('batch-sending-service-job');
    const emailModel = await createPublishedPostEmail(agent, settings, email_recipient_filter);

    assert.ok(emailModel.get('subject'));
    assert.ok(emailModel.get('from'));
    assert.equal(emailModel.get('source_type'), settings && settings.lexical ? 'lexical' : 'mobiledoc');

    // Await sending job
    await completedPromise;

    await emailModel.refresh();
    assert.equal(emailModel.get('status'), 'submitted');

    lastEmailModel = emailModel;

    // Get the email that was sent
    return {emailModel, ...(await getLastEmail())};
}

/**
 * Try sending an email, and assert that it failed
 * @returns {Promise<{emailModel: any}>}
 */
async function sendFailedEmail(agent, settings, email_recipient_filter) {
    // Prepare a post and email model
    const completedPromise = jobManager.awaitCompletion('batch-sending-service-job');
    const emailModel = await createPublishedPostEmail(agent, settings, email_recipient_filter);

    assert.ok(emailModel.get('subject'));
    assert.ok(emailModel.get('from'));
    assert.equal(emailModel.get('source_type'), settings && settings.lexical ? 'lexical' : 'mobiledoc');

    // Await sending job
    await completedPromise;

    await emailModel.refresh();
    assert.equal(emailModel.get('status'), 'failed');

    lastEmailModel = emailModel;

    // Get the email that was sent
    return {emailModel};
}

async function retryEmail(agent, emailId) {
    await agent.put(`emails/${emailId}/retry`)
        .expectStatus(200);
}

/**
 * Returns the last email that was sent via the stub, with all recipient variables replaced
 * @returns {Promise<SendEmail>}
 */
async function getLastEmail() {
    const mailgunCreateMessageStub = mockManager.getMailgunCreateMessageStub();
    assert.ok(mailgunCreateMessageStub);
    sinon.assert.called(mailgunCreateMessageStub);

    const messageData = mailgunCreateMessageStub.lastCall.lastArg;
    let html = messageData.html;
    let plaintext = messageData.text;
    const recipientVariables = JSON.parse(messageData['recipient-variables']);
    const recipientData = recipientVariables[Object.keys(recipientVariables)[0]];

    for (const [key, value] of Object.entries(recipientData)) {
        html = html.replace(new RegExp(`%recipient.${key}%`, 'g'), value);
        plaintext = plaintext.replace(new RegExp(`%recipient.${key}%`, 'g'), value);
    }

    return {
        emailModel: lastEmailModel,
        ...messageData,
        html,
        plaintext,
        recipientData
    };
}

function testCleanedSnapshot({html, plaintext}, ignoreReplacements) {
    for (const {match, replacement} of ignoreReplacements) {
        if (match instanceof RegExp) {
            html = html.replace(match, replacement);
            plaintext = plaintext.replace(match, replacement);
        } else {
            html = html.replace(new RegExp(escapeRegExp(match), 'g'), replacement);
            plaintext = plaintext.replace(new RegExp(escapeRegExp(match), 'g'), replacement);
        }
    }
    should({html, plaintext}).matchSnapshot();
}

async function matchEmailSnapshot() {
    const lastEmail = await getLastEmail();
    const defaultNewsletter = await lastEmail.emailModel.getLazyRelation('newsletter');
    const linkRegexp = /http:\/\/127\.0\.0\.1:2369\/r\/\w+/g;

    const ignoreReplacements = [
        {
            match: /\d{1,2}\s\w+\s\d{4}/g,
            replacement: 'date'
        },
        {
            match: defaultNewsletter.get('uuid'),
            replacement: 'requested-newsletter-uuid'
        },
        {
            match: lastEmail.emailModel.get('post_id'),
            replacement: 'post-id'
        },
        {
            match: (await lastEmail.emailModel.getLazyRelation('post')).get('uuid'),
            replacement: 'post-uuid'
        },
        {
            match: linkRegexp,
            replacement: 'http://127.0.0.1:2369/r/xxxxxx'
        },
        {
            match: linkRegexp,
            replacement: 'http://127.0.0.1:2369/r/xxxxxx'
        }
    ];

    if (lastEmail.recipientData.uuid) {
        ignoreReplacements.push({
            match: lastEmail.recipientData.uuid,
            replacement: 'member-uuid'
        });
    } else {
        // Sometimes uuid is not used if link tracking is disabled
        // Need to replace unsubscribe url instead (uuid is missing but it is inside the usubscribe url, causing snapshot updates)
        // Need to use unshift to make replacement work before newsletter uuid
        ignoreReplacements.unshift({
            match: lastEmail.recipientData.unsubscribe_url,
            replacement: 'unsubscribe_url'
        });
    }

    testCleanedSnapshot(lastEmail, ignoreReplacements);
}

module.exports = {
    getDefaultNewsletter,
    sendEmail,
    sendFailedEmail,
    retryEmail,
    matchEmailSnapshot
};
