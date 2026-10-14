import assert from 'node:assert/strict';
import sinon from 'sinon';

const getPostsService = require('../../../../../core/server/services/posts/posts-service-instance');
const PostsService = require('../../../../../core/server/services/posts/posts-service');
const PostsExporter = require('../../../../../core/server/services/posts/posts-exporter');
const PostStats = require('../../../../../core/server/services/posts/stats/post-stats');
const PostEmailHandler = require('../../../../../core/server/services/posts/post-email-handler');
const EmailService = require('../../../../../core/server/services/email-service/email-service');
const emailWrapper = require('../../../../../core/server/services/email-service');
const models = require('../../../../../core/server/models');
const db = require('../../../../../core/server/data/db');
const labs = require('../../../../../core/shared/labs');
const urlUtils = require('../../../../../core/shared/url-utils').default;
const url = require('../../../../../core/server/api/endpoints/utils/serializers/output/utils/url');
const settingsCache = require('../../../../../core/shared/settings-cache');
const settingsHelpers = require('../../../../../core/server/services/settings-helpers');
const { createModel } = require('./utils');

describe('Posts service factory', function () {
  let sandbox: sinon.SinonSandbox;
  let originalEmailService: PropertyDescriptor | undefined;

  beforeEach(function () {
    sandbox = sinon.createSandbox();
    originalEmailService = Object.getOwnPropertyDescriptor(emailWrapper, 'service');
  });

  afterEach(function () {
    sandbox.restore();
    if (originalEmailService) {
      Object.defineProperty(emailWrapper, 'service', originalEmailService);
    } else {
      delete emailWrapper.service;
    }
  });

  it('builds a fresh service graph without reading export context or scheduling email', function () {
    const email = new EmailService({});
    emailWrapper.service = email;
    const probes = [
      sandbox.stub(models.Post, 'findPage'),
      sandbox.stub(models.Post, 'findOne'),
      sandbox.stub(models.Newsletter, 'findAll'),
      sandbox.stub(models.Label, 'findAll'),
      sandbox.stub(models.Product, 'findAll'),
      sandbox.stub(db.knex, 'select'),
      sandbox.stub(url, 'forPost'),
      sandbox.stub(settingsCache, 'get'),
      sandbox.stub(settingsHelpers, 'isMembersEnabled'),
      sandbox.stub(settingsHelpers, 'arePaidMembersEnabled'),
      sandbox.stub(labs, 'isSet'),
      sandbox.stub(email, 'checkCanSendEmail'),
      sandbox.stub(email, 'createEmail'),
      sandbox.stub(email, 'scheduleEmail'),
      sandbox.stub(email, 'sendTestEmail'),
    ];

    const first = getPostsService();
    const second = getPostsService();

    assert.equal(getPostsService.PostsService, PostsService);
    assert.ok(first instanceof PostsService);
    assert.ok(second instanceof PostsService);
    assert.notEqual(first, second);
    for (const instance of [first, second]) {
      assert.ok(instance.stats instanceof PostStats);
      assert.ok(instance.postsExporter instanceof PostsExporter);
      assert.ok(instance.postEmailHandler instanceof PostEmailHandler);
      assert.equal(instance.models, models);
      assert.equal(instance.urlUtils, urlUtils);
      assert.equal(instance.postEmailHandler.models, models);
      assert.equal(instance.emailService, email);
      assert.equal(instance.postEmailHandler.emailService, email);
    }
    assert.notEqual(first.stats, second.stats);
    assert.notEqual(first.postsExporter, second.postsExporter);
    assert.notEqual(first.postEmailHandler, second.postEmailHandler);
    for (const probe of probes) {
      sinon.assert.notCalled(probe);
    }
  });

  it('calls the current shared labs function from an already constructed service', function () {
    const service = getPostsService();
    const isSet = sandbox.stub(labs, 'isSet').returns(false);

    assert.equal(service.isSet('exampleFlag'), false);
    isSet.returns(true);
    assert.equal(service.isSet('exampleFlag'), true);
    sinon.assert.calledTwice(isSet);
    sinon.assert.alwaysCalledWithExactly(isSet, 'exampleFlag');
    sinon.assert.alwaysCalledOn(isSet, labs);
  });

  it('captures the current email provider for both service and handler, including an uninitialized wrapper', function () {
    emailWrapper.service = undefined;
    const beforeEmailInit = getPostsService();
    const firstEmail = new EmailService({});
    emailWrapper.service = firstEmail;
    const first = getPostsService();
    const secondEmail = new EmailService({});
    emailWrapper.service = secondEmail;
    const second = getPostsService();

    assert.equal(beforeEmailInit.emailService, undefined);
    assert.equal(beforeEmailInit.postEmailHandler.emailService, undefined);
    assert.equal(first.emailService, firstEmail);
    assert.equal(first.postEmailHandler.emailService, firstEmail);
    assert.equal(second.emailService, secondEmail);
    assert.equal(second.postEmailHandler.emailService, secondEmail);
  });

  it('wires the exporter to shared models, settings helpers, settings cache and post URL serializer', async function () {
    const service = getPostsService();
    const post = createModel({
      id: 'exported-post',
      title: 'Exported post',
      status: 'published',
      visibility: 'public',
      loaded: ['authors', 'tags', 'email'],
      authors: [],
      tags: [],
      email: createModel({ opened_count: 7, track_clicks: true }),
      count__clicks: 3,
      count__signups: 2,
      count__paid_conversions: 1,
    });
    const findPage = sandbox.stub(models.Post, 'findPage').resolves({ data: [post] });
    const collections = [models.Newsletter, models.Label, models.Product];
    const findAll = collections.map((model) =>
      sandbox.stub(model, 'findAll').resolves({ models: [] }),
    );
    const membersEnabled = sandbox.stub(settingsHelpers, 'isMembersEnabled').returns(true);
    const paidEnabled = sandbox.stub(settingsHelpers, 'arePaidMembersEnabled').returns(true);
    const getSetting = sandbox.stub(settingsCache, 'get').returns(true);
    const forPost = sandbox.stub(url, 'forPost').callsFake((_id, json) => {
      (json as { url?: string }).url = 'https://example.com/exported-post/';
    });

    const rows: Record<string, unknown>[] = [];
    for await (const row of await service.postsExporter.export({ limit: 1 })) {
      rows.push(row);
    }

    assert.equal(rows.length, 1);
    assert.deepEqual(
      {
        url: rows[0].url,
        opens: rows[0].opens,
        clicks: rows[0].clicks,
        signups: rows[0].signups,
        paid_conversions: rows[0].paid_conversions,
      },
      {
        url: 'https://example.com/exported-post/',
        opens: 7,
        clicks: 3,
        signups: 2,
        paid_conversions: 1,
      },
    );
    sinon.assert.calledOnce(findPage);
    sinon.assert.calledOn(findPage, models.Post);
    findAll.forEach((stub, index) => {
      sinon.assert.calledOnceWithExactly(stub);
      sinon.assert.calledOn(stub, collections[index]);
    });
    sinon.assert.calledOnceWithExactly(membersEnabled);
    sinon.assert.calledOn(membersEnabled, settingsHelpers);
    sinon.assert.calledOnceWithExactly(paidEnabled);
    sinon.assert.calledOn(paidEnabled, settingsHelpers);
    assert.deepEqual(getSetting.args, [
      ['members_track_sources'],
      ['email_track_opens'],
      ['email_track_clicks'],
    ]);
    sinon.assert.alwaysCalledOn(getSetting, settingsCache);
    sinon.assert.calledOnceWithExactly(forPost, post.id, sinon.match({ title: 'Exported post' }), {
      options: {},
    });
    sinon.assert.calledOn(forPost, url);
  });
});
