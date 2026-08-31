const { fixtureManager, mockManager } = require('./e2e-framework');
const moment = require('moment');
const models = require('../../core/server/models');
const sinon = require('sinon');
const emailService = require('../../core/server/services/email-service');
const escapeRegExp = require('lodash/escapeRegExp');
const assert = require('node:assert/strict');
const { assertMatchSnapshot } = require('./assertions');

const getDefaultNewsletter = async function () {
  const newsletterSlug = fixtureManager.get('newsletters', 0).slug;
  return await models.Newsletter.findOne({ slug: newsletterSlug });
};

let postCounter = 0;

const emailJobTracker = {
  dispatched: new Map(),
  completed: new Map(),
  waiters: new Set(),

  reset() {
    this.dispatched.clear();
    this.completed.clear();
    this.waiters.clear();
  },

  count(map, emailId) {
    map.set(emailId, (map.get(emailId) || 0) + 1);
    this.resolveWaiters();
  },

  resolveWaiters() {
    for (const waiter of this.waiters) {
      if (waiter.ready()) {
        clearTimeout(waiter.timeout);
        this.waiters.delete(waiter);
        waiter.resolve();
      }
    }
  },

  waitUntil(ready) {
    if (ready()) {
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      const waiter = { ready, resolve, timeout: null };
      waiter.timeout = setTimeout(() => {
        this.waiters.delete(waiter);
        reject(
          new Error(
            `Timed out waiting for email jobs: dispatched=${JSON.stringify(Object.fromEntries(this.dispatched))} completed=${JSON.stringify(Object.fromEntries(this.completed))}`,
          ),
        );
      }, 10_000);
      this.waiters.add(waiter);
    });
  },
};

let trackedBatchSendingService;
let originalScheduleEmail;
let originalEmailJob;

function installEmailJobTracker() {
  const batchSendingService = emailService.batchSendingService;
  assert(batchSendingService, 'batch sending service must be initialized before tracking jobs');

  if (trackedBatchSendingService !== batchSendingService) {
    if (trackedBatchSendingService) {
      trackedBatchSendingService.scheduleEmail = originalScheduleEmail;
      trackedBatchSendingService.emailJob = originalEmailJob;
    }

    trackedBatchSendingService = batchSendingService;
    originalScheduleEmail = batchSendingService.scheduleEmail;
    originalEmailJob = batchSendingService.emailJob;

    batchSendingService.scheduleEmail = function (email) {
      emailJobTracker.count(emailJobTracker.dispatched, email.id);
      return originalScheduleEmail.apply(this, arguments);
    };

    batchSendingService.emailJob = async function ({ emailId }) {
      try {
        return await originalEmailJob.apply(this, arguments);
      } finally {
        emailJobTracker.count(emailJobTracker.completed, emailId);
      }
    };
  }

  emailJobTracker.reset();
}

beforeEach(function () {
  installEmailJobTracker();
});

function waitForEmailJob(emailId) {
  return emailJobTracker.waitUntil(() => {
    const dispatched = emailJobTracker.dispatched.get(emailId) || 0;
    return dispatched > 0 && (emailJobTracker.completed.get(emailId) || 0) >= dispatched;
  });
}

function allEmailJobsSettled() {
  return emailJobTracker.waitUntil(() => {
    for (const [emailId, count] of emailJobTracker.dispatched) {
      if ((emailJobTracker.completed.get(emailId) || 0) < count) {
        return false;
      }
    }
    return true;
  });
}

async function createPublishedPostEmail(agent, settings = {}, email_recipient_filter) {
  const post = {
    title: 'A random test post',
    status: 'draft',
    feature_image_alt: 'Testing sending',
    feature_image_caption: 'Testing <b>feature image caption</b>',
    created_at: moment().subtract(2, 'days').toISOString(),
    updated_at: moment().subtract(2, 'days').toISOString(),
    ...settings,
  };

  const res = await agent
    .post('posts/')
    .body({ posts: [post] })
    .expectStatus(201);

  const id = res.body.posts[0].id;

  // Make sure all posts are published in the samre order, with minimum 1s difference (to have consistent ordering when including latests posts)
  postCounter += 1;

  const updatedPost = {
    status: 'published',
    updated_at: res.body.posts[0].updated_at,
    // Fixed publish date to make sure snapshots are consistent
    published_at: moment(new Date(2050, 0, 1, 12, 0, postCounter)).toISOString(),
  };

  const newsletterSlug = fixtureManager.get('newsletters', 0).slug;
  await agent
    .put(
      `posts/${id}/?newsletter=${newsletterSlug}${email_recipient_filter ? `&email_segment=${email_recipient_filter}` : ''}`,
    )
    .body({ posts: [updatedPost] })
    .expectStatus(200);

  const emailModel = await models.Email.findOne({
    post_id: id,
  });
  assert(!!emailModel);

  return emailModel;
}
let lastEmailModel;

/**
 * @typedef {{html: string, plaintext: string, emailModel: any, recipientData: any, from: string, replyTo?: string}} SendEmail
 */

/**
 * Try sending an email, and assert that it succeeded
 * @returns {Promise<SendEmail>}
 */
async function sendEmail(agent, settings, email_recipient_filter) {
  // Prepare a post and email model
  const emailModel = await createPublishedPostEmail(agent, settings, email_recipient_filter);

  assert.ok(emailModel.get('subject'));
  assert.ok(emailModel.get('from'));
  // posts created with mobiledoc are converted to lexical on save
  assert.equal(emailModel.get('source_type'), 'lexical');

  // Await sending job
  await waitForEmailJob(emailModel.id);

  await emailModel.refresh();
  assert.equal(emailModel.get('status'), 'submitted');

  lastEmailModel = emailModel;

  // Get the email that was sent
  return { emailModel, ...(await getLastEmail()) };
}

/**
 * Try sending an email, and assert that it failed
 * @returns {Promise<{emailModel: any}>}
 */
async function sendFailedEmail(agent, settings, email_recipient_filter) {
  // Prepare a post and email model
  const emailModel = await createPublishedPostEmail(agent, settings, email_recipient_filter);

  assert.ok(emailModel.get('subject'));
  assert.ok(emailModel.get('from'));
  // posts created with mobiledoc are converted to lexical on save
  assert.equal(emailModel.get('source_type'), 'lexical');

  // Await sending job
  await waitForEmailJob(emailModel.id);

  await emailModel.refresh();
  assert.equal(emailModel.get('status'), 'failed');

  lastEmailModel = emailModel;

  // Get the email that was sent
  return { emailModel };
}

async function retryEmail(agent, emailId) {
  await agent.put(`emails/${emailId}/retry`).expectStatus(200);
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
    recipientData,
  };
}

function testCleanedSnapshot({ html, plaintext }, ignoreReplacements) {
  for (const { match, replacement } of ignoreReplacements) {
    if (match instanceof RegExp) {
      html = html.replace(match, replacement);
      plaintext = plaintext.replace(match, replacement);
    } else {
      html = html.replace(new RegExp(escapeRegExp(match), 'g'), replacement);
      plaintext = plaintext.replace(new RegExp(escapeRegExp(match), 'g'), replacement);
    }
  }
  assertMatchSnapshot({ html, plaintext });
}

async function matchEmailSnapshot() {
  const lastEmail = await getLastEmail();
  const defaultNewsletter = await lastEmail.emailModel.getLazyRelation('newsletter');
  const linkRegexp = /http:\/\/127\.0\.0\.1:\d+\/r\/\w+/g;

  const ignoreReplacements = [
    {
      match: /\d{1,2}\s\w+\s\d{4}/g,
      replacement: 'date',
    },
    {
      // Footer year is rendered live (new Date().getFullYear()); normalise
      // it so snapshots don't rot at every year boundary.
      match: new RegExp(`©\\s*${new Date().getFullYear()}`, 'g'),
      replacement: '© YYYY',
    },
    {
      match: defaultNewsletter.get('uuid'),
      replacement: 'requested-newsletter-uuid',
    },
    {
      match: lastEmail.emailModel.get('post_id'),
      replacement: 'post-id',
    },
    {
      match: (await lastEmail.emailModel.getLazyRelation('post')).get('uuid'),
      replacement: 'post-uuid',
    },
    {
      match: linkRegexp,
      replacement: 'http://127.0.0.1:2369/r/xxxxxx',
    },
    {
      match: linkRegexp,
      replacement: 'http://127.0.0.1:2369/r/xxxxxx',
    },
    {
      match: /key=[0-9a-f]+/g,
      replacement: 'key=xxxxxx',
    },
  ];

  if (lastEmail.recipientData.uuid) {
    ignoreReplacements.push({
      match: lastEmail.recipientData.uuid,
      replacement: 'member-uuid',
    });
  } else {
    // Sometimes uuid is not used if link tracking is disabled
    // Need to replace unsubscribe url instead (uuid is missing but it is inside the usubscribe url, causing snapshot updates)
    // Need to use unshift to make replacement work before newsletter uuid
    ignoreReplacements.unshift({
      match: lastEmail.recipientData.unsubscribe_url,
      replacement: 'unsubscribe_url',
    });
  }

  testCleanedSnapshot(lastEmail, ignoreReplacements);
}

module.exports = {
  getDefaultNewsletter,
  sendEmail,
  sendFailedEmail,
  retryEmail,
  matchEmailSnapshot,
  getLastEmail,
  waitForEmailJob,
  allEmailJobsSettled,
};
