// # llms.txt Frontend Routing Tests
// The llms service fetches content through the public Posts/Pages API with
// narrowed `fields` + `formats` options. These tests boot a full Ghost
// instance so the request runs through the real controllers and serializers,
// covering the fields/formats/url interaction the unit tests mock away.
const assert = require('node:assert/strict');
const sinon = require('sinon');
const supertest = require('supertest');
const testUtils = require('../utils');
const configUtils = require('../utils/config-utils');
const settingsCache = require('../../core/shared/settings-cache');

describe('llms.txt routing', function () {
  let request;
  let siteUrl;

  beforeAll(async function () {
    await testUtils.startGhost();
    siteUrl = configUtils.config.get('url').replace(/\/$/, '');
    request = supertest.agent(configUtils.config.get('url'));
  });

  it('serves llms.txt with published public entries and absolute urls', async function () {
    const res = await request
      .get('/llms.txt')
      .expect('Content-Type', /text\/plain/)
      .expect(200);

    // entries are linked via absolute urls resolved by the public API serializer
    assert.ok(
      res.text.includes(`[About this site](${siteUrl}/about.md)`),
      'expected absolute .md link for the about page',
    );
    assert.ok(
      res.text.includes(
        `[Start here for a quick overview of everything you need to know](${siteUrl}/welcome.md)`,
      ),
      'expected absolute .md link for the welcome post',
    );

    // descriptions come from plaintext, which is requested via `formats`
    // on top of the narrowed `fields`
    assert.match(
      res.text,
      /\[Start here for a quick overview of everything you need to know\]\([^)]+\) - We've crammed the most important information/,
    );

    // the .md discoverability line and the llms-full link in Optional
    assert.match(res.text, /Append `\.md` to any post or page URL/);
    assert.ok(
      res.text.includes(`[Full content of pages and posts](${siteUrl}/llms-full.txt)`),
      'expected llms-full link in Optional',
    );
  });

  it('serves llms-full.txt with entry bodies and absolute urls', async function () {
    const res = await request
      .get('/llms-full.txt')
      .expect('Content-Type', /text\/plain/)
      .expect(200);

    assert.match(res.text, /### About this site/);
    assert.match(res.text, /### Start here for a quick overview of everything you need to know/);
    assert.ok(
      res.text.includes(`URL: ${siteUrl}/about/`),
      'expected absolute url for the about page entry',
    );

    // entry bodies are rendered from html, which is requested via
    // `formats` on top of the narrowed `fields`
    assert.match(
      res.text,
      /An about page is a great example of one you might want to set up early on/,
    );

    // the .md discoverability line appears in both files
    assert.match(res.text, /Append `\.md` to any post or page URL/);

    // truncation footer (if present) points at the sitemap, not /llms.txt
    assert.doesNotMatch(res.text, /Use `\/llms\.txt`/);
  });

  describe('with machine payments enabled', function () {
    beforeEach(function () {
      sinon.restore();
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
        if (key === 'stripe_connect_secret_key') {
          return 'sk_test_machinepayments';
        }
        if (key === 'stripe_connect_publishable_key') {
          return 'pk_test_machinepayments';
        }
        return originalGet(key, options);
      });
    });

    beforeAll(async function () {
      const paid = testUtils.DataGenerator.forKnex.createPost({
        slug: 'llms-paid-discoverable',
        title: 'Paid Discoverable Post',
        visibility: 'paid',
        status: 'published',
        custom_excerpt: 'Agent teaser',
        lexical: testUtils.DataGenerator.markdownToLexical('secret'),
      });
      const membersOnly = testUtils.DataGenerator.forKnex.createPost({
        slug: 'llms-members-hidden',
        title: 'Members Hidden Post',
        visibility: 'members',
        status: 'published',
        custom_excerpt: 'Members teaser',
        lexical: testUtils.DataGenerator.markdownToLexical('members secret'),
      });
      await testUtils.fixtures.insertPosts([paid, membersOnly]);
    });

    afterAll(function () {
      sinon.restore();
    });

    it('includes purchasable paid posts in llms.txt', async function () {
      const res = await request
        .get('/llms.txt')
        .expect('Content-Type', /text\/plain/)
        .expect(200);

      assert.ok(
        res.text.includes(`[Paid Discoverable Post](${siteUrl}/llms-paid-discoverable.md)`),
        'expected paid post .md link when machine payments are enabled',
      );
      assert.match(res.text, /Agent teaser/);
      assert.doesNotMatch(res.text, /Members Hidden Post/);
    });

    it('lists paid posts with notices in llms-full.txt', async function () {
      const res = await request
        .get('/llms-full.txt')
        .expect('Content-Type', /text\/plain/)
        .expect(200);

      assert.match(res.text, /### Paid Discoverable Post/);
      assert.match(res.text, /paying subscribers only/i);
      assert.doesNotMatch(res.text, /### Members Hidden Post/);
    });
  });
});
