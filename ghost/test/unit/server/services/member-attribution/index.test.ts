import assert from 'node:assert/strict';
import sinon from 'sinon';
import { IncorrectUsageError } from '@tryghost/errors';
const settingsCache = require('../../../../../core/shared/settings-cache');
const config = require('../../../../../core/shared/config');
const urlUtils = require('../../../../../core/shared/url-utils').default;
const models = require('../../../../../core/server/models');

type Attribution = {
  referrerSource: string | null;
  referrerMedium: string | null;
};

type Root = {
  init(): Promise<void>;
  readonly service: {
    getAttributionFromContext(context: object): Promise<Attribution | null>;
    getAttribution(history: object[]): Promise<Attribution>;
    isTrackingEnabled: boolean;
    models: { MemberCreatedEvent: unknown };
    attributionBuilder: unknown;
    outboundLinkTagger: {
      addToUrl(url: URL): URL;
      isEnabled: boolean;
    };
  };
};

describe('Member attribution service root', function () {
  const sandbox = sinon.createSandbox();
  const modulePath = require.resolve('../../../../../core/server/services/member-attribution');
  const now = new Date('2026-01-01T12:00:00Z').getTime();
  let savedModule: NodeJS.Module | undefined;
  let root: Root;
  let getSetting: sinon.SinonStub;
  let getSiteUrl: sinon.SinonStub;
  let lookupIntegration: sinon.SinonStub;

  beforeEach(function () {
    sandbox.useFakeTimers({ now, toFake: ['Date'] });
    savedModule = require.cache[modulePath];
    delete require.cache[modulePath];
    getSetting = sandbox.stub(settingsCache, 'get');
    getSetting.withArgs('members_track_sources').returns(true);
    getSetting.withArgs('outbound_link_tagging').returns(true);
    const urlFor = sandbox.stub(urlUtils, 'urlFor').callThrough();
    urlFor.withArgs('home', true).returns('https://publication.example/');
    urlFor.withArgs('admin', true).returns('https://admin.publication.example/ghost/');
    getSiteUrl = sandbox.stub(config, 'getSiteUrl').returns('https://www.publication.example/');
    lookupIntegration = sandbox
      .stub(models.Integration, 'findOne')
      .resolves({ get: () => 'Importer' });
    root = require('../../../../../core/server/services/member-attribution').default;
  });

  afterEach(function () {
    sandbox.restore();
    delete require.cache[modulePath];
    if (savedModule) {
      require.cache[modulePath] = savedModule;
    }
  });

  it('retains the same usable graph across repeated initialization', async function () {
    assert.throws(() => root.service, IncorrectUsageError);
    assert.throws(() => root.service.attributionBuilder, IncorrectUsageError);
    assert.throws(() => root.service.outboundLinkTagger, IncorrectUsageError);
    assert.equal(await root.init(), undefined);
    assert.ok(root.service);
    assert.ok(root.service.outboundLinkTagger);
    const service = root.service;
    const builder = root.service.attributionBuilder;
    const tagger = root.service.outboundLinkTagger;
    await root.init();
    assert.ok(root.service);
    assert.ok(root.service.outboundLinkTagger);

    assert.equal(root.service, service);
    assert.equal(root.service.attributionBuilder, builder);
    assert.equal(root.service.outboundLinkTagger, tagger);
    assert.equal(
      (await service.getAttributionFromContext({ user: 'owner-id' }))?.referrerSource,
      'Created manually',
    );
    assert.equal(
      tagger.addToUrl(new URL('https://external.example/')).searchParams.get('ref'),
      'publication.example',
    );
  });

  it('honours tracking changes for a valid context without reconstructing the root', async function () {
    await root.init();
    assert.ok(root.service);
    assert.ok(root.service.outboundLinkTagger);
    const service = root.service;
    const context = { api_key: 'key-id', integration: { id: 'integration-id' } };
    assert.equal(
      (await service.getAttributionFromContext(context))?.referrerSource,
      'Integration: Importer',
    );
    sinon.assert.calledOnceWithExactly(lookupIntegration, { id: 'integration-id' });
    lookupIntegration.resetHistory();

    getSetting.withArgs('members_track_sources').returns(false);
    assert.equal(await service.getAttributionFromContext(context), null);
    sinon.assert.notCalled(lookupIntegration);

    getSetting.withArgs('members_track_sources').returns(true);
    assert.equal(
      (await service.getAttributionFromContext(context))?.referrerSource,
      'Integration: Importer',
    );
    assert.equal(root.service, service);
  });

  it('keeps API attribution when integration lookup rejects', async function () {
    await root.init();
    assert.ok(root.service);
    assert.ok(root.service.outboundLinkTagger);
    lookupIntegration.rejects(new Error('Integration lookup failed'));

    const attribution = await root.service.getAttributionFromContext({
      api_key: 'key-id',
      integration: { id: 'missing' },
    });

    assert.ok(attribution);
    assert.equal(attribution.referrerSource, 'Created via API');
    assert.equal(attribution.referrerMedium, 'Admin API');
  });

  it('honours tracking changes for valid history on the retained graph', async function () {
    await root.init();
    assert.ok(root.service);
    assert.ok(root.service.outboundLinkTagger);
    const history = [{ referrerSource: 'Newsletter', referrerMedium: 'Email', time: now }];
    assert.equal((await root.service.getAttribution(history)).referrerSource, 'Newsletter');

    getSetting.withArgs('members_track_sources').returns(false);
    const disabled = await root.service.getAttribution(history);
    assert.equal(disabled.referrerSource, null);
    assert.equal(disabled.referrerMedium, null);

    getSetting.withArgs('members_track_sources').returns(true);
    assert.equal((await root.service.getAttribution(history)).referrerSource, 'Newsletter');
  });

  it('reads outbound tagging policy and source URL when the retained tagger is called', async function () {
    await root.init();
    assert.ok(root.service);
    assert.ok(root.service.outboundLinkTagger);
    const tagger = root.service.outboundLinkTagger;
    const input = new URL('https://external.example/article?existing=1#heading');
    getSetting.withArgs('outbound_link_tagging').returns(false);
    assert.equal(tagger.addToUrl(input).href, input.href);

    getSetting.withArgs('outbound_link_tagging').returns(true);
    getSiteUrl.returns('https://updated.example/subdir/');
    const result = tagger.addToUrl(input);

    assert.equal(result.searchParams.get('ref'), 'updated.example');
    assert.equal(result.searchParams.get('existing'), '1');
    assert.equal(result.hash, '#heading');
    assert.equal(input.searchParams.has('ref'), false);
  });

  it('allows initialization to retry after a URL prerequisite throws', async function () {
    const failure = new Error('URL configuration unavailable');
    urlUtils.urlFor.withArgs('home', true).throws(failure);
    await assert.rejects(root.init(), (error) => error === failure);
    assert.throws(() => root.service, IncorrectUsageError);

    urlUtils.urlFor.withArgs('home', true).returns('https://publication.example/');
    await root.init();
    assert.ok(root.service);
    assert.ok(root.service.outboundLinkTagger);

    assert.equal(root.service.isTrackingEnabled, true);
    assert.equal(
      root.service.outboundLinkTagger
        .addToUrl(new URL('https://external.example/'))
        .searchParams.get('ref'),
      'publication.example',
    );
  });

  it('captures parser URLs at init while retaining live tracking callbacks', async function () {
    await root.init();
    assert.ok(root.service);
    assert.ok(root.service.outboundLinkTagger);
    const service = root.service;
    urlUtils.urlFor.withArgs('home', true).returns('https://updated.example/');
    urlUtils.urlFor.withArgs('admin', true).returns('https://admin.updated.example/ghost/');

    const originalAdmin = await service.getAttribution([
      {
        referrerSource: '',
        referrerUrl: 'https://admin.publication.example/ghost/#/dashboard',
        time: now,
      },
    ]);
    const updatedAdmin = await service.getAttribution([
      {
        referrerSource: '',
        referrerUrl: 'https://admin.updated.example/ghost/#/dashboard',
        time: now,
      },
    ]);

    assert.equal(originalAdmin.referrerSource, 'Ghost Explore');
    assert.equal(originalAdmin.referrerMedium, 'Ghost Network');
    assert.notEqual(updatedAdmin.referrerSource, 'Ghost Explore');
    sinon.assert.calledOnceWithExactly(urlUtils.urlFor.withArgs('home', true), 'home', true);
    sinon.assert.calledOnceWithExactly(urlUtils.urlFor.withArgs('admin', true), 'admin', true);
  });

  it('retries a failed composition after its helpers have been created', async function () {
    const failure = new Error('Event model unavailable');
    const eventModel = models.MemberCreatedEvent;
    const readEventModel = sandbox.stub().onFirstCall().throws(failure);
    readEventModel.returns(eventModel);
    sandbox.stub(models, 'MemberCreatedEvent').get(readEventModel);

    await assert.rejects(root.init(), (error) => error === failure);
    assert.throws(() => root.service, IncorrectUsageError);

    await root.init();
    assert.ok(root.service);
    assert.ok(root.service.outboundLinkTagger);

    assert.equal(root.service.models.MemberCreatedEvent, eventModel);
    assert.ok(root.service.attributionBuilder);
    assert.equal(root.service.isTrackingEnabled, true);
    assert.equal(root.service.outboundLinkTagger.isEnabled, true);
  });
});
