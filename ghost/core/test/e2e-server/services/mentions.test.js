/* global vi */
const { agentProvider, fixtureManager, mockManager } = require('../../utils/e2e-framework');
const nock = require('nock');
const sinon = require('sinon');
const assert = require('node:assert/strict');
const markdownToLexical = require('../../utils/fixtures/data-generator').markdownToLexical;
const mentionsService = require('../../../core/server/services/mentions');
const urlService = require('../../../core/server/services/url');
const events = require('../../../core/server/lib/common/events');

let agent;
let mentionUrl = new URL('https://www.otherghostsite.com/');
let mentionUrl2 = new URL('https://www.otherghostsite2.com/');
let mentionHtml = `Check out this really cool <a href="${mentionUrl.href}">other site</a>.`;
let mentionHtml2 = `Check out this really cool <a href="${mentionUrl2.href}">other site</a>.`;
let endpointUrl = new URL('https://www.endpoint.com/');
let endpointUrl2 = new URL('https://www.endpoint2.com/');
let targetHtml = `<head><link rel="webmention" href="${endpointUrl.href}"</head><body>Some content</body>`;
let targetHtml2 = `<head><link rel="webmention" href="${endpointUrl2.href}"</head><body>Some content</body>`;
let mentionMock;
let endpointMock;
const DomainEvents = require('@tryghost/domain-events');

// sendForPost runs from model events that fire on transaction commit and
// awaits DB work before dispatching. Track every run so tests can drain them.
const mentionEvents = [
  'post.published',
  'post.published.edited',
  'post.unpublished',
  'page.published',
  'page.published.edited',
  'page.unpublished',
];
const pendingSendForPost = [];
const wrappedListeners = [];

function trackSendForPost() {
  for (const eventName of mentionEvents) {
    const original = events.listeners(eventName).find((l) => l.name === 'bound sendForPost');
    assert.ok(original, `expected a sendForPost listener on ${eventName}`);
    const wrapper = (...args) => {
      const run = original(...args);
      pendingSendForPost.push(run);
      return run;
    };
    events.removeListener(eventName, original);
    events.on(eventName, wrapper);
    wrappedListeners.push({ eventName, original, wrapper });
  }
}

function untrackSendForPost() {
  for (const { eventName, original, wrapper } of wrappedListeners) {
    events.removeListener(eventName, wrapper);
    events.on(eventName, original);
  }
  wrappedListeners.length = 0;
}

// Draining the runs proves no job was dispatched - for the cases whose
// filters return before reaching the queue.
async function sendForPostSettled() {
  while (pendingSendForPost.length) {
    await Promise.all(pendingSendForPost.splice(0));
  }
  await DomainEvents.allSettled();
}

let processedJobs;

function recordProcessed(resource) {
  processedJobs.push(resource);
}

// Wrap the seam the job handler calls: completion here means the job ran,
// without coupling the test to the queue or its backend.
function trackWebmentionSending() {
  const sendingService = mentionsService.sendingService;
  const original = sendingService.sendForHTMLResource.bind(sendingService);
  sinon.stub(sendingService, 'sendForHTMLResource').callsFake(async (resource) => {
    try {
      return await original(resource);
    } finally {
      // Recorded in finally: "processed" means the handler finished,
      // successful or not - the nock assertions decide correctness.
      recordProcessed(resource);
    }
  });
}

async function waitForSends(count, { timeoutMs = 5000 } = {}) {
  await vi.waitUntil(() => processedJobs.length >= count, { timeout: timeoutMs });
  await DomainEvents.allSettled();
}

const mentionsPost = {
  title: 'testing sending webmentions',
  lexical: markdownToLexical(mentionHtml),
};

const editedMentionsPost = {
  title: 'testing sending webmentions',
  lexical: markdownToLexical(mentionHtml2),
};

function addMentionMocks() {
  // mock response from website mentioned by post to provide endpoint
  mentionMock = nock(mentionUrl.href)
    .persist()
    .get('/')
    .reply(200, targetHtml, { 'content-type': 'text/html' });

  // mock response from mention endpoint, usually 201, sometimes 202
  endpointMock = nock(endpointUrl.href).persist().post('/').reply(201);
}

describe('Mentions Service', function () {
  beforeAll(async function () {
    agent = await agentProvider.getAdminAPIAgent();
    await fixtureManager.init('users');
    await agent.loginAsAdmin();
    trackSendForPost();
  });

  afterAll(function () {
    untrackSendForPost();
  });

  beforeEach(async function () {
    // externalRequest does dns lookup; stub to make sure we don't fail with fake domain names
    mockManager.disableNetwork();

    // mock response from website mentioned by post to provide endpoint
    addMentionMocks();

    await sendForPostSettled();
    processedJobs = [];
    trackWebmentionSending();
  });

  afterEach(async function () {
    sinon.restore();
    mockManager.restore();
  });

  describe('Sending Service', function () {
    describe(`does not send when we expect it to not send`, function () {
      it('New draft post created', async function () {
        const draftPost = { status: 'draft', ...mentionsPost };
        await agent
          .post('posts/')
          .body({ posts: [draftPost] })
          .expectStatus(201);

        await sendForPostSettled();

        assert.equal(mentionMock.isDone(), false);
        assert.equal(endpointMock.isDone(), false);
      });

      it('Email only post published', async function () {
        const publishedPost = { status: 'published', email_only: true, ...mentionsPost };
        await agent
          .post('posts/')
          .body({ posts: [publishedPost] })
          .expectStatus(201);

        await sendForPostSettled();

        assert.equal(mentionMock.isDone(), false);
        assert.equal(endpointMock.isDone(), false);
      });

      it('Post without content', async function () {
        const publishedPost = {
          status: 'published',
          lexical: markdownToLexical(''),
          title: 'empty post',
        };
        await agent
          .post('posts/')
          .body({ posts: [publishedPost] })
          .expectStatus(201);

        await sendForPostSettled();

        assert.equal(mentionMock.isDone(), false);
        assert.equal(endpointMock.isDone(), false);
      });

      it('New draft page created', async function () {
        const draftPage = { status: 'draft', ...mentionsPost };
        await agent
          .post('pages/')
          .body({ pages: [draftPage] })
          .expectStatus(201);

        await sendForPostSettled();

        assert.equal(mentionMock.isDone(), false);
        assert.equal(endpointMock.isDone(), false);
      });
    });

    describe(`does send when we expect it to send`, function () {
      it('Newly published post (post.published)', async function () {
        let publishedPost = { status: 'published', ...mentionsPost };
        await agent
          .post('posts/')
          .body({ posts: [publishedPost] })
          .expectStatus(201);

        await waitForSends(1);

        assert.equal(mentionMock.isDone(), true);
        assert.equal(endpointMock.isDone(), true);
      });

      it('Does not send for edited post without url changes (post.published.edited)', async function () {
        const publishedPost = { status: 'published', ...mentionsPost };
        const res = await agent
          .post('posts/')
          .body({ posts: [publishedPost] })
          .expectStatus(201);

        await waitForSends(1);

        // while not the point of the test, we should have real links/mentions to start with
        assert.equal(mentionMock.isDone(), true);
        assert.equal(endpointMock.isDone(), true);

        nock.cleanAll();
        addMentionMocks();
        assert.equal(mentionMock.isDone(), false, 'should be reset');
        assert.equal(endpointMock.isDone(), false, 'should be reset');

        const postId = res.body.posts[0].id;
        const editedPost = {
          lexical: markdownToLexical(mentionHtml + 'More content'),
          updated_at: res.body.posts[0].updated_at,
        };

        await agent
          .put(`posts/${postId}/`)
          .body({ posts: [editedPost] })
          .expectStatus(200);

        // The edit dispatches a job (the html changed); "does not send" is
        // the handler's link diff yielding nothing, so wait for processing.
        await waitForSends(2);

        assert.equal(mentionMock.isDone(), false);
        assert.equal(endpointMock.isDone(), false);
      });

      it('Does send for edited post with url changes (post.published.edited)', async function () {
        const publishedPost = { status: 'published', ...mentionsPost };
        const res = await agent
          .post('posts/')
          .body({ posts: [publishedPost] })
          .expectStatus(201);

        await waitForSends(1);

        // while not the point of the test, we should have real links/mentions to start with
        assert.equal(mentionMock.isDone(), true);
        assert.equal(endpointMock.isDone(), true);

        nock.cleanAll();
        addMentionMocks();
        assert.equal(mentionMock.isDone(), false, 'should be reset');
        assert.equal(endpointMock.isDone(), false, 'should be reset');

        // reset mocks for mention
        const mentionMockTwo = nock(mentionUrl2.href)
          .persist()
          .get('/')
          .reply(200, targetHtml2, { 'content-type': 'text/html' });

        const endpointMockTwo = nock(endpointUrl2.href).persist().post('/').reply(201);

        const postId = res.body.posts[0].id;
        const editedPost = {
          ...editedMentionsPost,
          updated_at: res.body.posts[0].updated_at,
        };

        await agent
          .put(`posts/${postId}/`)
          .body({ posts: [editedPost] })
          .expectStatus(200);

        await waitForSends(2);

        assert.equal(mentionMockTwo.isDone(), true);
        assert.equal(endpointMockTwo.isDone(), true);

        // Also send again to the deleted url
        assert.equal(mentionMock.isDone(), true);
        assert.equal(endpointMock.isDone(), true);
      });

      it('Unpublished post (post.unpublished)', async function () {
        const publishedPost = { status: 'published', ...mentionsPost };
        const res = await agent
          .post('posts/')
          .body({ posts: [publishedPost] })
          .expectStatus(201);

        await waitForSends(1);

        // while not the point of the test, we should have real links/mentions to start with
        assert.equal(mentionMock.isDone(), true);
        assert.equal(endpointMock.isDone(), true);

        nock.cleanAll();

        // reset mocks for mention
        const mentionMockTwo = nock(mentionUrl.href)
          .persist()
          .get('/')
          .reply(200, targetHtml, { 'content-type': 'text/html' });
        const endpointMockTwo = nock(endpointUrl.href).persist().post('/').reply(201);

        const postId = res.body.posts[0].id;
        // moving back to draft is how we unpublish
        const unpublishedPost = {
          status: 'draft',
          updated_at: res.body.posts[0].updated_at,
        };
        await agent
          .put(`posts/${postId}/`)
          .body({ posts: [unpublishedPost] })
          .expectStatus(200);

        await waitForSends(2);

        assert.equal(mentionMockTwo.isDone(), true);
        assert.equal(endpointMockTwo.isDone(), true);
      });

      it('Deleted published post sends with a resolvable url, not a thin resource', async function () {
        // Deleting a published post fires `unpublished` from onDestroyed,
        // by which point bookshelf has cleared the model's attributes.
        // The webmention job must still resolve the post's url — regression
        // for the thin-resource error on that path.
        const publishedPost = { status: 'published', ...mentionsPost };
        const res = await agent
          .post('posts/')
          .body({ posts: [publishedPost] })
          .expectStatus(201);

        await waitForSends(1);
        assert.equal(endpointMock.isDone(), true);

        nock.cleanAll();
        addMentionMocks();

        // Capture the resource the real webmention job hands the URL
        // service, so we can prove it isn't the attribute-less husk.
        const slug = res.body.posts[0].slug;
        const getUrlForResource = sinon
          .stub(urlService, 'getUrlForResource')
          .callsFake(() => `http://127.0.0.1:2369/${slug}/`);

        const postId = res.body.posts[0].id;
        await agent.delete(`posts/${postId}/`).expectStatus(204);

        await waitForSends(2);

        // the webmention for the removed content went out...
        assert.equal(endpointMock.isDone(), true);
        // ...and the resource that produced its url carried the post's
        // own columns (recovered from the destroyed model's previous
        // state), not a relations-only husk.
        sinon.assert.called(getUrlForResource);
        const resource = getUrlForResource.getCall(0).args[0];
        assert.equal(resource.status, 'published');
        assert.equal(resource.slug, slug);
      });

      it('Newly published page (page.published)', async function () {
        let publishedPage = { status: 'published', ...mentionsPost };
        await agent
          .post('pages/')
          .body({ pages: [publishedPage] })
          .expectStatus(201);

        await waitForSends(1);

        assert.equal(mentionMock.isDone(), true);
        assert.equal(endpointMock.isDone(), true);
      });

      it('Edited published page without url changes (page.published.edited)', async function () {
        const publishedPage = { status: 'published', ...mentionsPost };
        const res = await agent
          .post('pages/')
          .body({ pages: [publishedPage] })
          .expectStatus(201);

        await waitForSends(1);

        // while not the point of the test, we should have real links/mentions to start with
        assert.equal(mentionMock.isDone(), true);
        assert.equal(endpointMock.isDone(), true);

        nock.cleanAll();
        addMentionMocks();
        assert.equal(mentionMock.isDone(), false, 'should be reset');
        assert.equal(endpointMock.isDone(), false, 'should be reset');

        const pageId = res.body.pages[0].id;
        const editedPage = {
          lexical: markdownToLexical(mentionHtml + 'More content'),
          updated_at: res.body.pages[0].updated_at,
        };

        await agent
          .put(`pages/${pageId}/`)
          .body({ pages: [editedPage] })
          .expectStatus(200);

        // The edit dispatches a job (the html changed); "does not send" is
        // the handler's link diff yielding nothing, so wait for processing.
        await waitForSends(2);

        assert.equal(mentionMock.isDone(), false);
        assert.equal(mentionMock.isDone(), false);
      });

      it('Edited published page with url changes (page.published.edited)', async function () {
        const publishedPage = { status: 'published', ...mentionsPost };
        const res = await agent
          .post('pages/')
          .body({ pages: [publishedPage] })
          .expectStatus(201);

        await waitForSends(1);

        // while not the point of the test, we should have real links/mentions to start with
        assert.equal(mentionMock.isDone(), true);
        assert.equal(endpointMock.isDone(), true);

        nock.cleanAll();
        addMentionMocks();
        assert.equal(mentionMock.isDone(), false, 'should be reset');
        assert.equal(endpointMock.isDone(), false, 'should be reset');

        // reset mocks for mention
        const mentionMockTwo = nock(mentionUrl2.href)
          .persist()
          .get('/')
          .reply(200, targetHtml2, { 'content-type': 'text/html' });

        const endpointMockTwo = nock(endpointUrl2.href).persist().post('/').reply(201);

        const pageId = res.body.pages[0].id;
        const editedPage = {
          ...editedMentionsPost,
          updated_at: res.body.pages[0].updated_at,
        };

        await agent
          .put(`pages/${pageId}/`)
          .body({ pages: [editedPage] })
          .expectStatus(200);

        await waitForSends(2);

        assert.equal(mentionMockTwo.isDone(), true);
        assert.equal(endpointMockTwo.isDone(), true);

        // Also send again to the deleted url
        assert.equal(mentionMock.isDone(), true);
        assert.equal(endpointMock.isDone(), true);
      });

      it('Unpublished page (page.unpublished)', async function () {
        const publishedPage = { status: 'published', ...mentionsPost };
        const res = await agent
          .post('pages/')
          .body({ pages: [publishedPage] })
          .expectStatus(201);

        await waitForSends(1);

        // while not the point of the test, we should have real links/mentions to start with
        assert.equal(mentionMock.isDone(), true);
        assert.equal(endpointMock.isDone(), true);

        nock.cleanAll();

        // reset mocks for mention
        const mentionMockTwo = nock(mentionUrl.href)
          .persist()
          .get('/')
          .reply(200, targetHtml, { 'content-type': 'text/html' });
        const endpointMockTwo = nock(endpointUrl.href).persist().post('/').reply(201);

        const pageId = res.body.pages[0].id;
        // moving back to draft is how we unpublish
        const unpublishedPage = {
          status: 'draft',
          updated_at: res.body.pages[0].updated_at,
        };
        await agent
          .put(`pages/${pageId}/`)
          .body({ pages: [unpublishedPage] })
          .expectStatus(200);

        await waitForSends(2);

        assert.equal(mentionMockTwo.isDone(), true);
        assert.equal(endpointMockTwo.isDone(), true);
      });

      it('Sends for links that got removed from a post', async function () {
        const publishedPost = { status: 'published', ...mentionsPost };
        const res = await agent
          .post('posts/')
          .body({ posts: [publishedPost] })
          .expectStatus(201);

        await waitForSends(1);

        // while not the point of the test, we should have real links/mentions to start with
        assert.equal(mentionMock.isDone(), true);
        assert.equal(endpointMock.isDone(), true);

        nock.cleanAll();

        // reset mocks for mention
        const mentionMockTwo = nock(mentionUrl.href)
          .persist()
          .get('/')
          .reply(200, targetHtml, { 'content-type': 'text/html' });

        const endpointMockTwo = nock(endpointUrl.href).persist().post('/').reply(201);

        const postId = res.body.posts[0].id;
        const editedPost = {
          lexical: markdownToLexical(`mentions were removed from this post`),
          updated_at: res.body.posts[0].updated_at,
        };
        await agent
          .put(`posts/${postId}/`)
          .body({ posts: [editedPost] })
          .expectStatus(200);

        await waitForSends(2);

        assert.equal(mentionMockTwo.isDone(), true);
        assert.equal(endpointMockTwo.isDone(), true);
      });

      it('Sends for links that got removed from a page', async function () {
        const publishedPage = { status: 'published', ...mentionsPost };
        const res = await agent
          .post('pages/')
          .body({ pages: [publishedPage] })
          .expectStatus(201);

        await waitForSends(1);

        // while not the point of the test, we should have real links/mentions to start with
        assert.equal(mentionMock.isDone(), true);
        assert.equal(endpointMock.isDone(), true);

        nock.cleanAll();

        // reset mocks for mention
        const mentionMockTwo = nock(mentionUrl.href)
          .persist()
          .get('/')
          .reply(200, targetHtml, { 'content-type': 'text/html' });

        const endpointMockTwo = nock(endpointUrl.href).persist().post('/').reply(201);

        const pageId = res.body.pages[0].id;
        const editedPage = {
          lexical: markdownToLexical(`mentions were removed from this post`),
          updated_at: res.body.pages[0].updated_at,
        };
        await agent
          .put(`pages/${pageId}/`)
          .body({ pages: [editedPage] })
          .expectStatus(200);

        await waitForSends(2);

        assert.equal(mentionMockTwo.isDone(), true);
        assert.equal(endpointMockTwo.isDone(), true);
      });

      // there's no special handling for this atm, but could be down the road
      it('New paid post', async function () {
        const publishedPost = { status: 'published', visibility: 'paid', ...mentionsPost };
        await agent
          .post('posts/')
          .body({ posts: [publishedPost] })
          .expectStatus(201);

        await waitForSends(1);

        assert.equal(mentionMock.isDone(), true);
        assert.equal(endpointMock.isDone(), true);
      });
    });
  });
});
