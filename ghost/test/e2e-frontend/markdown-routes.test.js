const assert = require('node:assert/strict');
const path = require('node:path');
const sinon = require('sinon');
const supertest = require('supertest');
const testUtils = require('../utils');
const configUtils = require('../utils/config-utils');
const settingsCache = require('../../core/shared/settings-cache');

describe('Markdown routing with custom routes', function () {
  let request;

  beforeAll(async function () {
    const routesFilePath = path.join(
      configUtils.config.get('paths:appRoot'),
      'test/utils/fixtures/settings/markdown-routes.yaml',
    );

    await testUtils.startGhost({ routesFilePath });
    await testUtils.fixtures.insertPosts([
      testUtils.DataGenerator.forKnex.createPost({
        slug: 'markdown-members-page',
        title: 'Members corner',
        type: 'page',
        visibility: 'members',
        status: 'published',
        lexical: testUtils.DataGenerator.markdownToLexical('Members secret body'),
      }),
    ]);
    request = supertest.agent(configUtils.config.get('url'));
  });

  afterEach(function () {
    sinon.restore();
  });

  afterAll(function () {
    return testUtils.stopGhost();
  });

  it('redirects a collection data page to its routed markdown URL', async function () {
    const redirect = await request.get('/contact.md?ref=llms').redirects(0).expect(301);
    assert.equal(redirect.headers.location, '/rubrique.md?ref=llms');

    const res = await request
      .get('/rubrique.md')
      .expect('Content-Type', /text\/markdown/)
      .expect(200);
    assert.equal(res.headers['content-location'], '/rubrique.md');
    assert.match(res.text, /# Contact/);
  });

  it('redirects a root data page to working /index.md without looping', async function () {
    const redirect = await request.get('/about.md').redirects(0).expect(301);
    assert.equal(redirect.headers.location, '/index.md');

    const res = await request
      .get('/index.md')
      .expect('Content-Type', /text\/markdown/)
      .expect(200);
    assert.equal(res.headers['content-location'], '/index.md');
    assert.match(res.text, /# About this site/);
  });

  it('redirects a post data entry to its routed markdown URL', async function () {
    const redirect = await request.get('/rubrique/welcome.md').redirects(0).expect(301);
    assert.equal(redirect.headers.location, '/start.md');

    const res = await request
      .get('/start.md')
      .expect('Content-Type', /text\/markdown/)
      .expect(200);
    assert.equal(res.headers['content-location'], '/start.md');
    assert.match(res.text, /# Start here for a quick overview of everything you need to know/);
  });

  it('serves the free preview for a members-only data page', async function () {
    const redirect = await request.get('/markdown-members-page.md').redirects(0).expect(301);
    assert.equal(redirect.headers.location, '/members-corner.md');

    const res = await request
      .get('/members-corner.md')
      .expect('Content-Type', /text\/markdown/)
      .expect(200);
    assert.equal(res.headers['content-location'], '/members-corner.md');
    assert.match(res.text, /# Members corner/);
    assert.match(res.text, /This page is for subscribers only\./);
    assert.doesNotMatch(res.text, /Members secret body/);
  });

  it('redirects the routed markdown URL to the route when llms is disabled', async function () {
    const originalGet = settingsCache.get;
    sinon.stub(settingsCache, 'get').callsFake(function (key, options) {
      if (key === 'llms_enabled') {
        return false;
      }
      return originalGet(key, options);
    });

    const res = await request.get('/rubrique.md').redirects(0).expect(302);
    assert.equal(res.headers.location, '/rubrique/');
  });
});
