import assert from 'node:assert/strict';
import { setImmediate } from 'node:timers/promises';
import { IncorrectUsageError } from '@tryghost/errors';
import sinon from 'sinon';
import type { IncomingRecommendationService as IncomingService } from '../../../../../core/server/services/recommendations/service/incoming-recommendation-service';

// Use the same classes and dependency objects as the root.
const {
  BookshelfRecommendationRepository,
  BookshelfClickEventRepository,
  IncomingRecommendationService,
  RecommendationService,
}: typeof import('../../../../../core/server/services/recommendations/service') = require('../../../../../core/server/services/recommendations/service');
const SettingsBREADService = require('../../../../../core/server/services/settings/settings-bread-service');
const MentionCreatedEvent = require('../../../../../core/server/services/mentions/mention-created-event');
const DomainEvents = require('@tryghost/domain-events');
const logging = require('@tryghost/logging');
const config = require('../../../../../core/shared/config');
const settingsCache = require('../../../../../core/shared/settings-cache');
const sentry = require('../../../../../core/shared/sentry');
const urlUtils = require('../../../../../core/shared/url-utils').default;
const models = require('../../../../../core/server/models');
const mail = require('../../../../../core/server/lib/mail');
const externalRequest = require('../../../../../core/server/lib/request-external');
const oembedService = require('../../../../../core/server/services/oembed');
const mentionsRoot = require('../../../../../core/server/services/mentions').default;
const staff = require('../../../../../core/server/services/staff').default;
const ROOT_PATH = require.resolve('../../../../../core/server/services/recommendations');

type Root = (typeof import('../../../../../core/server/services/recommendations'))['default'];
type Mention = Parameters<IncomingService['sendRecommendationEmail']>[0];
type MentionEventHandler = (event: { data: { mention: Mention } }) => Promise<void>;
type UrlMapper = (url: URL) => URL | undefined;

const DISABLED_MESSAGE = '[Recommendations] Background refreshes are disabled via config';
const RECOMMENDATION_SOURCE = 'https://other.example/.well-known/recommendations.json';

// Bookshelf repositories keep their model and Sentry client as protected fields.
function bound(repository: unknown): { Model: unknown; sentry: unknown } {
  return repository as { Model: unknown; sentry: unknown };
}

function mention(source: string, verified = true): Mention & { verified: boolean } {
  return {
    id: 'mention-id',
    source: new URL(source),
    verified,
    sourceTitle: 'Other site article',
    sourceSiteTitle: 'Other site',
    sourceAuthor: null,
    sourceExcerpt: 'An excerpt',
    sourceFavicon: null,
    sourceFeaturedImage: new URL('https://other.example/cover.png'),
  };
}

describe('Recommendations service root', function () {
  const sandbox = sinon.createSandbox();
  let originalRoot: NodeJS.Module | undefined;
  let root: Root;
  let mentionsApi: { listMentions: sinon.SinonStub; refreshMentions: sinon.SinonStub };
  let sendingService: { sendAll: sinon.SinonStub };
  let mentionsReady: boolean;
  let addMapper: sinon.SinonStub;
  let subscribe: sinon.SinonStub;
  let getConfig: sinon.SinonStub;
  let getSetting: sinon.SinonStub;
  let info: sinon.SinonStub;
  let error: sinon.SinonStub;
  let outgoingInit: sinon.SinonStub;
  let incomingInit: sinon.SinonStub;

  beforeEach(function () {
    // Load a fresh root per test so each case initializes the index's own wiring, then
    // restore the original entry for the consumers that captured it at import.
    originalRoot = require.cache[ROOT_PATH];
    delete require.cache[ROOT_PATH];
    mentionsApi = {
      listMentions: sandbox.stub().resolves({ data: [] }),
      refreshMentions: sandbox.stub().resolves(),
    };
    sendingService = { sendAll: sandbox.stub().resolves() };
    // Capture the mapper and subscriber instead of installing them into the shared
    // mentions metadata and event bus, which other files in this worker also use.
    addMapper = sandbox.stub();
    mentionsReady = true;
    // Boot awaits the Mentions root before this root runs; reading it earlier throws.
    sandbox.stub(mentionsRoot, 'service').get(() => {
      if (!mentionsReady) {
        throw new IncorrectUsageError({
          message: 'Mentions used before init(). Call init() from boot first.',
        });
      }
      return { api: mentionsApi, sendingService, metadata: { addMapper } };
    });
    subscribe = sandbox.stub(DomainEvents, 'subscribe');
    getConfig = sandbox.stub(config, 'get').callThrough();
    getConfig.withArgs('services:recommendations:enabled').returns(undefined);
    getSetting = sandbox.stub(settingsCache, 'get').callThrough();
    getSetting
      .withArgs('recommendations_enabled', { resolve: false })
      .returns({ key: 'recommendations_enabled', value: 'false', group: 'recommendations' });
    info = sandbox.stub(logging, 'info');
    error = sandbox.stub(logging, 'error');
    outgoingInit = sandbox.stub(RecommendationService.prototype, 'init').resolves();
    incomingInit = sandbox.stub(IncomingRecommendationService.prototype, 'init').resolves();
    root = require(ROOT_PATH).default;
  });

  afterEach(function () {
    sandbox.restore();
    if (originalRoot) {
      require.cache[ROOT_PATH] = originalRoot;
    } else {
      delete require.cache[ROOT_PATH];
    }
  });

  function installedMapper(): UrlMapper {
    sinon.assert.calledOnce(addMapper);
    return addMapper.firstCall.args[0];
  }

  function installedHandler(): MentionEventHandler {
    sinon.assert.calledOnce(subscribe);
    assert.equal(subscribe.firstCall.args[0], MentionCreatedEvent);
    return subscribe.firstCall.args[1];
  }

  it('exports one root whose service is unavailable before init', function () {
    assert.equal(require(ROOT_PATH).default, root);
    assert.throws(() => root.service, IncorrectUsageError);
    sinon.assert.notCalled(addMapper);
    sinon.assert.notCalled(subscribe);
    sinon.assert.notCalled(outgoingInit);
  });

  it('publishes repositories, services and controllers wired to the shared models and helpers', async function () {
    assert.equal(await root.init(), undefined);

    // Consumers read only the three controllers; the graph behind them is reached through them.
    const published = root.service;
    assert.deepEqual(Object.keys(published).sort(), [
      'controller',
      'incomingRecommendationController',
      'wellknownController',
    ]);
    const service = published.controller.service;
    assert.ok(service instanceof RecommendationService);
    assert.equal(published.wellknownController.service, service);
    const incoming = published.incomingRecommendationController.service;
    assert.ok(incoming instanceof IncomingRecommendationService);

    assert.ok(service.repository instanceof BookshelfRecommendationRepository);
    assert.equal(bound(service.repository).Model, models.Recommendation);
    assert.equal(bound(service.repository).sentry, sentry);
    assert.ok(service.clickEventRepository instanceof BookshelfClickEventRepository);
    assert.equal(bound(service.clickEventRepository).Model, models.RecommendationClickEvent);
    assert.equal(bound(service.clickEventRepository).sentry, sentry);
    // The subscribe repository is the click repository class bound to the subscribe model.
    assert.ok(service.subscribeEventRepository instanceof BookshelfClickEventRepository);
    assert.equal(
      bound(service.subscribeEventRepository).Model,
      models.RecommendationSubscribeEvent,
    );
    assert.equal(bound(service.subscribeEventRepository).sentry, sentry);
    assert.notEqual(service.subscribeEventRepository, service.clickEventRepository);
    assert.equal(service.mentionSendingService, sendingService);
    assert.equal(service.wellknownService.urlUtils, urlUtils);
  });

  it('rejects init without publishing anything while Mentions is not ready, and initializes once it is', async function () {
    mentionsReady = false;

    await assert.rejects(root.init(), IncorrectUsageError);

    assert.throws(() => root.service, IncorrectUsageError);
    sinon.assert.notCalled(addMapper);
    sinon.assert.notCalled(subscribe);
    sinon.assert.notCalled(outgoingInit);
    sinon.assert.notCalled(incomingInit);

    mentionsReady = true;
    assert.equal(await root.init(), undefined);
    assert.equal(root.service.controller.service.mentionSendingService, sendingService);
  });

  for (const enabled of [undefined, true] as const) {
    it(`starts both background initializers without awaiting them when the config value is ${enabled}`, async function () {
      getConfig.withArgs('services:recommendations:enabled').returns(enabled);
      const outgoing = Promise.withResolvers<void>();
      const incoming = Promise.withResolvers<void>();
      outgoingInit.returns(outgoing.promise);
      incomingInit.returns(incoming.promise);

      try {
        const initialization = root.init();

        // Both refreshes start during the synchronous composition and init does not wait for them.
        sinon.assert.calledOnce(outgoingInit);
        sinon.assert.calledOnce(incomingInit);
        assert.equal(await initialization, undefined);
        assert.equal(outgoingInit.firstCall.thisValue, root.service.controller.service);
        assert.equal(
          incomingInit.firstCall.thisValue,
          root.service.incomingRecommendationController.service,
        );
        sinon.assert.notCalled(info);
      } finally {
        outgoing.resolve();
        incoming.resolve();
      }
    });
  }

  it('skips both background initializers and logs when the config disables them', async function () {
    getConfig.withArgs('services:recommendations:enabled').returns(false);

    assert.equal(await root.init(), undefined);

    sinon.assert.notCalled(outgoingInit);
    sinon.assert.notCalled(incomingInit);
    sinon.assert.calledOnceWithExactly(info, DISABLED_MESSAGE);
    assert.ok(root.service.controller.service instanceof RecommendationService);
    installedMapper();
    installedHandler();
  });

  it('logs a background initializer rejection instead of failing init', async function () {
    const failure = new Error('Metadata refresh unavailable');
    outgoingInit.rejects(failure);

    assert.equal(await root.init(), undefined);
    await setImmediate();

    sinon.assert.calledOnceWithExactly(error, failure);
    sinon.assert.calledOnce(incomingInit);
    assert.ok(root.service.controller.service instanceof RecommendationService);
  });

  it('retains the first graph and installs the mapper and subscriber once across repeated init', async function () {
    await root.init();
    const published = root.service;

    assert.equal(await root.init(), undefined);

    assert.equal(root.service, published);
    sinon.assert.calledOnce(addMapper);
    sinon.assert.calledOnce(subscribe);
    sinon.assert.calledOnce(outgoingInit);
    sinon.assert.calledOnce(incomingInit);
  });

  // An early model lookup and the mailer, constructed after both outgoing services
  // and repositories, bracket the composition that must finish before any side effect.
  for (const [step, breakConstruction] of [
    [
      'the click event model lookup',
      (failure: Error) => {
        const original = Object.getOwnPropertyDescriptor(models, 'RecommendationClickEvent');
        assert.ok(original);
        Object.defineProperty(models, 'RecommendationClickEvent', {
          configurable: true,
          get() {
            throw failure;
          },
        });
        return () => Object.defineProperty(models, 'RecommendationClickEvent', original);
      },
    ],
    [
      'the incoming notification mailer',
      (failure: Error) => {
        const GhostMailer = sandbox.stub(mail, 'GhostMailer').throws(failure);
        return () => GhostMailer.restore();
      },
    ],
  ] as const) {
    it(`rejects init when ${step} throws, without subscribing or starting refreshes, and builds a fresh graph on retry`, async function () {
      const failure = new Error('Construction failed');
      const restore = breakConstruction(failure);

      try {
        await assert.rejects(root.init(), (err: unknown) => err === failure);
      } finally {
        restore();
      }

      assert.throws(() => root.service, IncorrectUsageError);
      sinon.assert.notCalled(addMapper);
      sinon.assert.notCalled(subscribe);
      sinon.assert.notCalled(outgoingInit);
      sinon.assert.notCalled(incomingInit);
      sinon.assert.notCalled(info);

      // The failed attempt is discarded, so a retry composes a complete graph once.
      assert.equal(await root.init(), undefined);
      const service = root.service.controller.service;
      assert.ok(service.repository instanceof BookshelfRecommendationRepository);
      assert.equal(bound(service.clickEventRepository).Model, models.RecommendationClickEvent);
      assert.ok(
        root.service.incomingRecommendationController.service instanceof
          IncomingRecommendationService,
      );
      sinon.assert.calledOnce(addMapper);
      sinon.assert.calledOnce(subscribe);
      sinon.assert.calledOnce(outgoingInit);
      sinon.assert.calledOnce(incomingInit);
    });
  }

  it('maps recommendation well-known URLs to their site for mentions metadata', async function () {
    await root.init();
    const mapper = installedMapper();
    const source = new URL('https://other.example/blog/.well-known/recommendations.json?ref=a');

    assert.equal(mapper(source)?.href, 'https://other.example/blog?ref=a');
    assert.equal(mapper(new URL(RECOMMENDATION_SOURCE))?.href, 'https://other.example/');
    assert.equal(mapper(new URL('https://other.example/recommendations.json')), undefined);
    assert.equal(
      mapper(new URL('https://other.example/.well-known/recommendations.json/x')),
      undefined,
    );
    assert.equal(source.href, 'https://other.example/blog/.well-known/recommendations.json?ref=a');
  });

  it('emails a verified recommendation mention through the published incoming service', async function () {
    await root.init();
    const handler = installedHandler();
    const sendRecommendationEmail = sandbox
      .stub(root.service.incomingRecommendationController.service, 'sendRecommendationEmail')
      .resolves();
    const received = mention(RECOMMENDATION_SOURCE);

    await handler({ data: { mention: received } });

    sinon.assert.calledOnceWithExactly(sendRecommendationEmail, received);
    sinon.assert.calledOnceWithExactly(
      info,
      `[INCOMING RECOMMENDATION] Received recommendation from ${RECOMMENDATION_SOURCE}`,
    );
  });

  for (const [description, ignored] of [
    ['an unverified recommendation mention', mention(RECOMMENDATION_SOURCE, false)],
    ['a verified mention of another page', mention('https://other.example/recommendations.json')],
  ] as const) {
    it(`does not email ${description}`, async function () {
      await root.init();
      const handler = installedHandler();
      const sendRecommendationEmail = sandbox
        .stub(root.service.incomingRecommendationController.service, 'sendRecommendationEmail')
        .resolves();

      await handler({ data: { mention: ignored } });

      sinon.assert.notCalled(sendRecommendationEmail);
      sinon.assert.notCalled(info);
    });
  }

  it('sends incoming recommendation emails to alert users through GhostMailer and the staff renderer read at send time', async function () {
    await root.init();
    const getEmailAlertUsers = sandbox.stub(models.User, 'getEmailAlertUsers').resolves([
      { email: 'owner@site.example', slug: 'owner', name: 'Owner' },
      { email: 'admin@site.example', slug: 'admin', name: 'Admin' },
    ]);
    const renderHTML = sandbox.stub().resolves('<p>New recommendation</p>');
    const renderText = sandbox.stub().resolves('New recommendation');
    // The renderer reads the ready Staff service per email.
    sandbox.stub(staff, 'service').get(() => ({ emails: { renderHTML, renderText } }));
    const send = sandbox.stub(mail.GhostMailer.prototype, 'send').resolves({});
    const getByUrl = sandbox
      .stub(root.service.controller.service.repository, 'getByUrl')
      .resolves(null);

    await root.service.incomingRecommendationController.service.sendRecommendationEmail(
      mention(RECOMMENDATION_SOURCE),
    );

    sinon.assert.calledOnceWithExactly(getEmailAlertUsers, 'recommendation-received');
    sinon.assert.calledOnce(getByUrl);
    assert.equal(getByUrl.firstCall.args[0].href, 'https://other.example/');
    const recommendation = {
      id: 'mention-id',
      title: 'Other site',
      url: new URL('https://other.example/'),
      excerpt: 'An excerpt',
      favicon: null,
      featuredImage: new URL('https://other.example/cover.png'),
      recommendingBack: false,
    };
    const recipients = [
      { email: 'owner@site.example', slug: 'owner' },
      { email: 'admin@site.example', slug: 'admin' },
    ];
    assert.deepEqual(
      renderHTML.args,
      recipients.map((recipient) => ['recommendation-received', { recommendation, recipient }]),
    );
    assert.deepEqual(
      renderText.args,
      recipients.map((recipient) => ['recommendation-received', { recommendation, recipient }]),
    );
    assert.deepEqual(
      send.args,
      recipients.map((recipient) => [
        {
          to: recipient.email,
          subject: '👍 New recommendation: Other site',
          html: '<p>New recommendation</p>',
          text: 'New recommendation',
        },
      ]),
    );
  });

  it('browses incoming recommendations through the shared mentions API and the published repository', async function () {
    await root.init();
    mentionsApi.listMentions.resolves({
      data: [
        mention(RECOMMENDATION_SOURCE),
        mention('https://third.example/.well-known/recommendations.json'),
      ],
      meta: { pagination: { page: 2, limit: 1, pages: 2, total: 2, next: null, prev: 1 } },
    });
    const getByUrl = sandbox
      .stub(root.service.controller.service.repository, 'getByUrl')
      .callsFake(async (url: URL) =>
        url.href === 'https://third.example/' ? ({ plain: { id: 'existing' } } as never) : null,
      );

    const result = await root.service.incomingRecommendationController.browse({
      data: {},
      options: { page: '2', limit: '1' },
    });

    sinon.assert.calledOnceWithExactly(mentionsApi.listMentions, {
      filter: `source:~$'/.well-known/recommendations.json'`,
      page: 2,
      limit: 1,
    });
    assert.deepEqual(
      getByUrl.args.map(([url]) => url.href),
      ['https://other.example/', 'https://third.example/'],
    );
    assert.deepEqual(result, {
      data: [
        {
          id: 'mention-id',
          title: 'Other site',
          excerpt: 'An excerpt',
          featured_image: 'https://other.example/cover.png',
          favicon: null,
          url: 'https://other.example/',
          recommending_back: false,
        },
        {
          id: 'mention-id',
          title: 'Other site',
          excerpt: 'An excerpt',
          featured_image: 'https://other.example/cover.png',
          favicon: null,
          url: 'https://third.example/',
          recommending_back: true,
        },
      ],
      meta: { pagination: { page: 2, limit: 1, pages: 2, total: 2, next: null, prev: 1 } },
    });
  });

  it('fetches recommendation metadata through the shared external request client and falls back to oEmbed', async function () {
    await root.init();
    const get = sandbox.stub(externalRequest, 'get').resolves({ statusCode: 404, body: '' });
    const fetchOembed = sandbox.stub(oembedService, 'fetchOembedDataFromUrl').resolves({
      version: '1.0',
      type: 'mention',
      url: 'https://other.example/',
      metadata: {
        title: 'Other site',
        description: 'A description',
        publisher: null,
        author: null,
        thumbnail: 'https://other.example/cover.png',
        icon: null,
      },
    });

    const metadata = await root.service.controller.service.recommendationMetadataService.fetch(
      new URL('https://other.example/'),
    );

    sinon.assert.calledOnce(get);
    assert.equal(get.firstCall.args[0], 'https://other.example/members/api/site');
    assert.deepEqual(get.firstCall.args[1].timeout, { request: 5000 });
    assert.deepEqual(get.firstCall.args[1].retry, { limit: 3 });
    sinon.assert.calledOnceWithExactly(fetchOembed, 'https://other.example/', 'mention');
    assert.deepEqual(metadata, {
      title: 'Other site',
      excerpt: 'A description',
      featuredImage: new URL('https://other.example/cover.png'),
      favicon: null,
      oneClickSubscribe: false,
    });
  });

  describe('recommendations_enabled setting', function () {
    it('reads the current setting synchronously on every call as a string', async function () {
      await root.init();
      const enabler = root.service.controller.service.recommendationEnablerService;

      assert.equal(enabler.getSetting(), 'false');

      getSetting
        .withArgs('recommendations_enabled', { resolve: false })
        .returns({ key: 'recommendations_enabled', value: true, group: 'recommendations' });

      assert.equal(enabler.getSetting(), 'true');
    });

    it('resolves setSetting before the internal settings edit settles', async function () {
      await root.init();
      const pending = Promise.withResolvers<unknown[]>();
      const edit = sandbox.stub(SettingsBREADService.prototype, 'edit').returns(pending.promise);
      let settled = false;

      try {
        const result = root.service.controller.service.recommendationEnablerService
          .setSetting('true')
          .then(() => {
            settled = true;
          });
        await setImmediate();

        // The edit promise is dropped: callers cannot observe persistence or its failure.
        assert.equal(settled, true);
        sinon.assert.calledOnceWithExactly(
          edit,
          [{ key: 'recommendations_enabled', value: 'true' }],
          { context: { internal: true } },
        );
        await result;
      } finally {
        pending.resolve([]);
      }
    });
  });
});
