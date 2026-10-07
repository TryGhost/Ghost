// Machine-payments markdown (.md) routes for paid/members posts.
// Exercises the e2e coverage path for markdown.ts paid challenge/refuse branches.
const assert = require('node:assert/strict');
const moment = require('moment');
const sinon = require('sinon');
const supertest = require('supertest');
const testUtils = require('../utils');
const configUtils = require('../utils/config-utils');
const settingsCache = require('../../core/shared/settings-cache');

describe('Machine payments markdown routing', function () {
  let request;
  let machinePayments;
  const paidSlug = 'mp-paid-markdown';
  const membersSlug = 'mp-members-markdown';

  beforeAll(async function () {
    const originalGet = settingsCache.get;
    sinon.stub(settingsCache, 'get').callsFake(function (key, options) {
      if (key === 'labs') {
        return { machinePayments: true };
      }
      if (key === 'llms_enabled') {
        return true;
      }
      if (key === 'machine_payments_enabled') {
        return true;
      }
      if (key === 'machine_payments_amount') {
        return 100;
      }
      if (key === 'machine_payments_currency') {
        return 'USD';
      }
      if (key === 'stripe_connect_secret_key') {
        return 'sk_test_machinepayments';
      }
      if (key === 'stripe_connect_publishable_key') {
        return 'pk_test_machinepayments';
      }

      return originalGet(key, options);
    });

    await testUtils.startGhost();

    const lexical = testUtils.DataGenerator.markdownToLexical('Secret paid body');
    await testUtils.fixtures.insertPosts([
      testUtils.DataGenerator.forKnex.createPost({
        slug: paidSlug,
        visibility: 'paid',
        status: 'published',
        published_at: moment().toDate(),
        lexical,
      }),
      testUtils.DataGenerator.forKnex.createPost({
        slug: membersSlug,
        visibility: 'members',
        status: 'published',
        published_at: moment().toDate(),
        lexical,
      }),
    ]);

    machinePayments = require('../../core/server/services/machine-payments');
    request = supertest.agent(configUtils.config.get('url'));
  });

  afterEach(function () {
    if (machinePayments.challengeOrFulfill?.restore) {
      machinePayments.challengeOrFulfill.restore();
    }
    if (machinePayments.isPurchasable?.restore) {
      machinePayments.isPurchasable.restore();
    }
  });

  afterAll(function () {
    sinon.restore();
  });

  it('serves free-preview markdown for members-only posts', async function () {
    const res = await request
      .get(`/${membersSlug}.md`)
      .expect(200)
      .expect('Content-Type', /text\/markdown/);

    assert.match(res.text, /# /);
    assert.match(res.text, /This post is for subscribers only\./);
    assert.match(res.text, /Subscribe:/);
    assert.doesNotMatch(res.text, /Secret paid body/);
  });

  it('challenges purchasable paid posts with 402 before rendering', async function () {
    sinon.stub(machinePayments, 'challengeOrFulfill').resolves(
      new Response('', {
        status: 402,
        headers: {
          'WWW-Authenticate': 'Payment realm="mpp"',
          'Content-Type': 'text/markdown; charset=utf-8',
        },
      }),
    );

    const res = await request.get(`/${paidSlug}.md`).expect(402);

    assert.equal(res.headers['www-authenticate'], 'Payment realm="mpp"');
    sinon.assert.calledOnce(machinePayments.challengeOrFulfill);
    const [, options] = machinePayments.challengeOrFulfill.firstCall.args;
    assert.equal(options.resourceType, 'posts');
    assert.equal(options.contentLocation, `/${paidSlug}.md`);
    assert.equal(typeof options.renderPreviewMarkdown, 'function');
  });

  it('serves paid markdown after the orchestrator fulfills payment', async function () {
    sinon.stub(machinePayments, 'challengeOrFulfill').callsFake(async (_request, options) => {
      const body = options.renderMarkdown({
        id: 'paid',
        title: 'Paid',
        html: '<p>Secret paid body</p>',
        url: `http://example.com/${paidSlug}/`,
        visibility: 'paid',
      });
      return new Response(body, {
        status: 200,
        headers: {
          'Content-Type': 'text/markdown; charset=utf-8',
          'Cache-Control': 'private, no-store',
          'Content-Location': options.contentLocation,
        },
      });
    });

    const res = await request
      .get(`/${paidSlug}.md`)
      .set('Authorization', 'Payment test-credential')
      .expect(200)
      .expect('Content-Type', /text\/markdown/);

    assert.equal(res.headers['cache-control'], 'private, no-store');
    assert.equal(res.headers['content-location'], `/${paidSlug}.md`);
    assert.match(res.text, /Secret paid body/);
  });

  it('serves free-preview markdown for paid posts when they are not purchasable', async function () {
    sinon.stub(machinePayments, 'isPurchasable').returns(false);

    const res = await request
      .get(`/${paidSlug}.md`)
      .expect(200)
      .expect('Content-Type', /text\/markdown/);

    assert.match(res.text, /This post is for paying subscribers only\./);
    assert.match(res.text, /Subscribe:/);
    assert.doesNotMatch(res.text, /Secret paid body/);
  });

  it('serves paywall preview content on gated .md when a paywall card is present', async function () {
    const previewSlug = 'mp-paid-preview-markdown';
    await testUtils.fixtures.insertPosts([
      testUtils.DataGenerator.forKnex.createPost({
        slug: previewSlug,
        title: 'Paywall Preview Post',
        custom_excerpt: 'Custom teaser excerpt',
        visibility: 'paid',
        status: 'published',
        published_at: moment().toDate(),
        lexical: testUtils.DataGenerator.markdownToLexical(
          'Free preview above the wall\n\n<!--members-only-->\n\nSecret paid body',
        ),
      }),
    ]);
    sinon.stub(machinePayments, 'isPurchasable').returns(false);

    const res = await request
      .get(`/${previewSlug}.md`)
      .expect(200)
      .expect('Content-Type', /text\/markdown/);

    assert.match(res.text, /# Paywall Preview Post/);
    assert.match(res.text, /Free preview above the wall/);
    assert.match(res.text, /Custom teaser excerpt/);
    assert.match(res.text, /This post is for paying subscribers only\./);
    assert.doesNotMatch(res.text, /Secret paid body/);
  });

  it('serves title and excerpt without body when gated post has no paywall card', async function () {
    const noPreviewSlug = 'mp-paid-no-preview-markdown';
    await testUtils.fixtures.insertPosts([
      testUtils.DataGenerator.forKnex.createPost({
        slug: noPreviewSlug,
        title: 'No Preview Paid Post',
        custom_excerpt: 'Only the excerpt is public',
        visibility: 'paid',
        status: 'published',
        published_at: moment().toDate(),
        lexical: testUtils.DataGenerator.markdownToLexical('Secret paid body with no paywall'),
      }),
    ]);
    sinon.stub(machinePayments, 'isPurchasable').returns(false);

    const res = await request
      .get(`/${noPreviewSlug}.md`)
      .expect(200)
      .expect('Content-Type', /text\/markdown/);

    assert.match(res.text, /# No Preview Paid Post/);
    assert.match(res.text, /Only the excerpt is public/);
    assert.match(res.text, /This post is for paying subscribers only\./);
    assert.doesNotMatch(res.text, /Secret paid body with no paywall/);
  });

  it('ignores Payment credentials on HTML permalinks for gated posts', async function () {
    const challengeOrFulfill = sinon.stub(machinePayments, 'challengeOrFulfill');

    const res = await request
      .get(`/${paidSlug}/`)
      .set('Authorization', 'Payment test-credential')
      .expect(200)
      .expect('Content-Type', /html/);

    sinon.assert.notCalled(challengeOrFulfill);
    assert.doesNotMatch(res.text, /Secret paid body/);
    assert.equal(res.headers['www-authenticate'], undefined);
  });

  it('ignores Payment credentials on HTML permalinks even when Accept prefers markdown', async function () {
    const challengeOrFulfill = sinon.stub(machinePayments, 'challengeOrFulfill');

    // Canonical URLs always render HTML; markdown lives on explicit `.md` URLs.
    const res = await request
      .get(`/${paidSlug}/`)
      .set('Accept', 'text/markdown')
      .set('Authorization', 'Payment test-credential')
      .expect(200)
      .expect('Content-Type', /html/);

    sinon.assert.notCalled(challengeOrFulfill);
    assert.doesNotMatch(res.text, /Secret paid body/);
    assert.equal(res.headers['www-authenticate'], undefined);
  });
});
