import assert from 'node:assert/strict';
import path from 'node:path';
import sinon from 'sinon';

const ObjectID = require('bson-objectid').default;
const DomainEvents = require('@tryghost/domain-events');
const logging = require('@tryghost/logging');
const events = require('../../../../../core/server/lib/common/events');
const models = require('../../../../../core/server/models');
const urlUtils = require('../../../../../core/shared/url-utils').default;
const settingsCache = require('../../../../../core/shared/settings-cache');
const urlService = require('../../../../../core/server/services/url');
const oembedService = require('../../../../../core/server/services/oembed');
const MentionController = require('../../../../../core/server/services/mentions/mention-controller');
const WebmentionMetadata = require('../../../../../core/server/services/mentions/webmention-metadata');
const MentionsAPI = require('../../../../../core/server/services/mentions/mentions-api');
const BookshelfMentionRepository = require('../../../../../core/server/services/mentions/bookshelf-mention-repository');
const MentionSendingService = require('../../../../../core/server/services/mentions/mention-sending-service');
const MentionCreatedEvent = require('../../../../../core/server/services/mentions/mention-created-event');
const ProcessWebmentionJob =
  require('../../../../../core/server/services/mentions/process-webmention-job').default;
const SendWebmentionsJob =
  require('../../../../../core/server/services/mentions/send-webmentions-job').default;

const POST_EVENTS = [
  'post.published',
  'post.published.edited',
  'post.unpublished',
  'page.published',
  'page.published.edited',
  'page.unpublished',
];

describe('Mentions service root', function () {
  const sandbox = sinon.createSandbox();
  const rootDirectory = path.resolve(__dirname, '../../../../../core/server/services/mentions');
  // The root is a CommonJS facade behind index.js; both entries must reload
  // together so each test starts from the import-time shape.
  const rootModules = [require.resolve(rootDirectory), path.join(rootDirectory, 'service.js')];
  let savedModules: (NodeJS.Module | undefined)[];
  let previousListeners: Record<string, Function[]>;
  let root: ReturnType<typeof loadRoot>;
  let jobsService: { dispatch: sinon.SinonStub };
  let getSiteUrl: sinon.SinonStub;
  let urlFor: sinon.SinonStub;
  let getSetting: sinon.SinonStub;
  let mentionFindOne: sinon.SinonStub;
  let mentionAdd: sinon.SinonStub;
  let fetchOembedData: sinon.SinonStub;
  let dispatch: sinon.SinonStub;

  const sourceUrl = new URL('https://source.example/a-post-that-links-here/');
  const targetUrl = new URL('https://publication.example/target-post/');
  const targetPostId = '6400000000000000000000a1';

  function loadRoot() {
    return require(rootDirectory);
  }

  beforeEach(function () {
    // The unit project shares one module registry, so each test loads a fresh
    // root and restores the original for the files that captured it.
    savedModules = rootModules.map((modulePath) => require.cache[modulePath]);
    for (const modulePath of rootModules) {
      delete require.cache[modulePath];
    }
    previousListeners = Object.fromEntries(
      POST_EVENTS.map((eventName) => [eventName, events.listeners(eventName)]),
    );
    sandbox.stub(logging);
    jobsService = { dispatch: sandbox.stub().resolves() };
    getSiteUrl = sandbox.stub(urlUtils, 'getSiteUrl').returns('https://publication.example/');
    urlFor = sandbox.stub(urlUtils, 'urlFor');
    urlFor.withArgs('home', true).returns('https://publication.example/');
    sandbox
      .stub(urlUtils, 'absoluteToRelative')
      .callsFake((absoluteUrl) => new URL(absoluteUrl as string).pathname);
    getSetting = sandbox.stub(settingsCache, 'get');
    getSetting.withArgs('is_private').returns(false);
    sandbox.stub(urlService, 'getRequiredRelations').returns([]);
    sandbox
      .stub(urlService, 'getUrlForResource')
      .returns('https://publication.example/source-post/');
    sandbox
      .stub(urlService, 'resolveUrl')
      .withArgs('/target-post/')
      .resolves({ type: 'posts', id: targetPostId });
    mentionFindOne = sandbox.stub(models.Mention, 'findOne').resolves(null);
    mentionAdd = sandbox.stub(models.Mention, 'add').resolves();
    fetchOembedData = sandbox.stub(oembedService, 'fetchOembedDataFromUrl').resolves({
      metadata: {
        publisher: 'Source Site',
        title: 'Source Title',
        description: 'Source excerpt',
        author: 'Source Author',
        thumbnail: 'https://source.example/image.png',
        icon: 'https://source.example/favicon.ico',
      },
      body: `<p>Read <a href="${targetUrl.href}">this</a>.</p>`,
      contentType: 'text/html',
    });
    dispatch = sandbox.stub(DomainEvents, 'dispatch');
    root = loadRoot();
  });

  afterEach(function () {
    for (const eventName of POST_EVENTS) {
      for (const listener of ownedListeners(eventName)) {
        events.removeListener(eventName, listener);
      }
    }
    sandbox.restore();
    rootModules.forEach((modulePath, index) => {
      delete require.cache[modulePath];
      if (savedModules[index]) {
        require.cache[modulePath] = savedModules[index];
      }
    });
  });

  function ownedListeners(eventName: string) {
    return events
      .listeners(eventName)
      .filter((listener: Function) => !previousListeners[eventName].includes(listener));
  }

  function ownedListenerCount() {
    return POST_EVENTS.reduce((count, eventName) => count + ownedListeners(eventName).length, 0);
  }

  type FakePost = ReturnType<typeof fakePost>;

  function fakePost({
    html,
    previousHtml = null,
    status = 'published',
    previousStatus = 'draft',
  }: {
    html: string;
    previousHtml?: string | null;
    status?: string;
    previousStatus?: string;
  }) {
    const attributes: Record<string, string> = {
      id: 'post-id',
      status,
      html,
      type: 'post',
      slug: 'source-post',
    };
    const previous: Record<string, string | null> = { status: previousStatus, html: previousHtml };
    return {
      id: attributes.id,
      relations: {},
      get: (property: string) => attributes[property],
      previous: (property: string) => previous[property],
      toJSON: () => ({ ...attributes }),
    };
  }

  async function firePostPublished(post: FakePost) {
    const [listener] = ownedListeners('post.published');
    assert.ok(listener, 'init must register a post.published listener');
    await listener(post, {});
  }

  it('publishes a controller and metadata at import and nothing else before init', function () {
    assert.ok(root.controller instanceof MentionController);
    assert.ok(root.metadata instanceof WebmentionMetadata);
    assert.equal(root.api, null);
    assert.equal(root.repository, null);
    assert.equal(root.sendingService, null);
    assert.equal(root.didInit, false);
    assert.equal(ownedListenerCount(), 0);
  });

  it('rejects browse and receive through the import-time controller before init', async function () {
    await assert.rejects(root.controller.browse({ options: {} }), TypeError);
    await assert.rejects(
      root.controller.receive({ data: { source: sourceUrl.href, target: targetUrl.href } }),
      TypeError,
    );
  });

  it('publishes the api, repository and sending service synchronously when init is called', async function () {
    const pending = root.init({ jobsService });

    // Recommendations reads api and sendingService in the same Promise.all
    // expression as this init in boot, before this promise settles.
    assert.ok(root.api instanceof MentionsAPI);
    assert.ok(root.repository instanceof BookshelfMentionRepository);
    assert.ok(root.sendingService instanceof MentionSendingService);
    assert.equal(root.didInit, true);

    assert.equal(await pending, undefined);
  });

  it('registers one bound sendForPost listener for each post and page event', async function () {
    await root.init({ jobsService });

    for (const eventName of POST_EVENTS) {
      const owned = ownedListeners(eventName);
      assert.equal(owned.length, 1, eventName);
      // The sending-service HTTP tests find and wrap these listeners by name.
      assert.equal(owned[0].name, 'bound sendForPost', eventName);
    }
  });

  it('dispatches a process-webmention job through the jobs service given to init', async function () {
    await root.init({ jobsService });

    await root.controller.receive({ data: { source: sourceUrl.href, target: targetUrl.href } });

    sinon.assert.calledOnce(jobsService.dispatch);
    const job = jobsService.dispatch.firstCall.args[0];
    assert.ok(job instanceof ProcessWebmentionJob);
    assert.equal(job.source, sourceUrl.href);
    assert.equal(job.target, targetUrl.href);
  });

  it('retains the same instances, listeners and jobs service across repeated init', async function () {
    await root.init({ jobsService });
    const { api, repository, sendingService, controller, metadata } = root;
    const laterJobsService = { dispatch: sandbox.stub().resolves() };

    await root.init({ jobsService: laterJobsService });
    await root.controller.receive({ data: { source: sourceUrl.href, target: targetUrl.href } });

    assert.equal(root.api, api);
    assert.equal(root.repository, repository);
    assert.equal(root.sendingService, sendingService);
    assert.equal(root.controller, controller);
    assert.equal(root.metadata, metadata);
    assert.equal(ownedListenerCount(), POST_EVENTS.length);
    sinon.assert.calledOnce(jobsService.dispatch);
    sinon.assert.notCalled(laterJobsService.dispatch);
  });

  it('resolves browse resources through the Post model', async function () {
    await root.init({ jobsService });
    const withResource = fakeMentionModel({ resource_id: targetPostId });
    const withoutResource = fakeMentionModel({ resource_id: null });
    sandbox.stub(models.Mention, 'findPage').resolves({
      data: [withResource, withoutResource],
      meta: { pagination: { page: 1, pages: 1, limit: 15, total: 2, prev: null, next: null } },
    });
    const targetPost: Record<string, string> = { title: 'Target Post', type: 'post' };
    const findPost = sandbox.stub(models.Post, 'findOne').resolves({
      get: (property: string) => targetPost[property],
    });

    const result = await root.controller.browse({ options: {} });

    sinon.assert.calledOnceWithExactly(findPost, { id: targetPostId });
    assert.equal(result.data[0].resource.id.toHexString(), targetPostId);
    assert.equal(result.data[0].resource.name, 'Target Post');
    assert.equal(result.data[0].resource.type, 'post');
    assert.equal(result.data[1].resource, null);
    assert.equal('resourceId' in result.data[0], false);
  });

  it('reads the privacy setting when a post event fires rather than at init', async function () {
    await root.init({ jobsService });
    const post = fakePost({ html: '<a href="https://other.example/article">Read</a>' });

    getSetting.withArgs('is_private').returns(true);
    await firePostPublished(post);
    sinon.assert.notCalled(jobsService.dispatch);

    getSetting.withArgs('is_private').returns(false);
    await firePostPublished(post);

    sinon.assert.calledOnce(jobsService.dispatch);
    const job = jobsService.dispatch.firstCall.args[0];
    assert.ok(job instanceof SendWebmentionsJob);
    assert.equal(job.sourceUrl, 'https://publication.example/source-post/');
    assert.deepEqual(job.links, ['https://other.example/article']);
    sinon.assert.notCalled(logging.error);
  });

  it('reads the site URL when filtering links rather than at init', async function () {
    await root.init({ jobsService });
    urlFor.withArgs('home', true).returns('https://moved.example/');

    await firePostPublished(
      fakePost({
        html: [
          '<a href="https://publication.example/own">own</a>',
          '<a href="https://moved.example/own">moved</a>',
          '<a href="https://other.example/article">other</a>',
        ].join(''),
      }),
    );

    sinon.assert.calledOnce(jobsService.dispatch);
    assert.deepEqual(jobsService.dispatch.firstCall.args[0].links, [
      'https://publication.example/own',
      'https://other.example/article',
    ]);
  });

  it('processes a webmention through the wired repository, routing, resource lookup and metadata', async function () {
    await root.init({ jobsService });

    await root.controller.processWebmention({ source: sourceUrl.href, target: targetUrl.href });

    sinon.assert.calledOnce(fetchOembedData);
    assert.equal(fetchOembedData.firstCall.args[0], sourceUrl.href);
    assert.equal(fetchOembedData.firstCall.args[1], 'mention');
    sinon.assert.calledWith(
      mentionFindOne,
      { source: sourceUrl.href, target: targetUrl.href },
      { require: false },
    );
    sinon.assert.calledOnce(mentionAdd);
    const row = mentionAdd.firstCall.args[0];
    assert.equal(row.source, sourceUrl.href);
    assert.equal(row.target, targetUrl.href);
    assert.equal(row.resource_id, targetPostId);
    assert.equal(row.resource_type, 'post');
    assert.equal(row.source_title, 'Source Title');
    assert.equal(row.source_site_title, 'Source Site');
    assert.equal(row.source_author, 'Source Author');
    assert.equal(row.source_excerpt, 'Source excerpt');
    assert.equal(row.source_featured_image, 'https://source.example/image.png');
    assert.equal(row.source_favicon, 'https://source.example/favicon.ico');
    assert.equal(row.verified, true);
    assert.equal(row.deleted, false);
    sinon.assert.calledOnce(dispatch);
    const event = dispatch.firstCall.args[0];
    assert.ok(event instanceof MentionCreatedEvent);
    assert.equal(event.data.mention.verified, true);
    assert.equal(event.data.mention.source.href, sourceUrl.href);
    sinon.assert.notCalled(logging.error);
  });

  it('compares webmention targets against the site URL captured at init', async function () {
    await root.init({ jobsService });
    getSiteUrl.returns('https://moved.example/');

    await root.api.processWebmention({ source: sourceUrl, target: targetUrl });
    sinon.assert.calledOnce(mentionAdd);

    await assert.rejects(
      root.api.processWebmention({
        source: sourceUrl,
        target: new URL('https://moved.example/target-post/'),
      }),
      /is not a valid URL for this site/,
    );
    sinon.assert.calledOnce(mentionAdd);
  });

  it('leaves didInit set with a partial facade when construction fails and does not retry', async function () {
    getSiteUrl.returns('not a url');

    await assert.rejects(root.init({ jobsService }), TypeError);

    // Current behaviour: the flag is set before construction, so the failed
    // attempt publishes only what it built and a later init does nothing.
    assert.equal(root.didInit, true);
    assert.ok(root.repository instanceof BookshelfMentionRepository);
    assert.equal(root.api, null);
    assert.equal(root.sendingService, null);
    assert.equal(ownedListenerCount(), 0);

    getSiteUrl.returns('https://publication.example/');
    await root.init({ jobsService });

    assert.equal(root.api, null);
    assert.equal(root.sendingService, null);
    assert.equal(ownedListenerCount(), 0);
  });

  function fakeMentionModel({ resource_id }: { resource_id: string | null }) {
    const row: Record<string, unknown> = {
      id: new ObjectID().toHexString(),
      source: sourceUrl.href,
      target: targetUrl.href,
      created_at: new Date('2026-04-01T00:00:00Z'),
      payload: '{}',
      resource_id,
      resource_type: resource_id ? 'post' : null,
      source_title: 'Source Title',
      source_site_title: 'Source Site',
      source_author: null,
      source_excerpt: null,
      source_favicon: null,
      source_featured_image: null,
      verified: true,
      deleted: false,
      revalidation_failure_count: 0,
    };
    return { get: (property: string) => row[property] };
  }
});
