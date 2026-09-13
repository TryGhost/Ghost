const assert = require('node:assert/strict');
const path = require('node:path');
const supertest = require('supertest');
const testUtils = require('../utils');
const configUtils = require('../utils/config-utils');

describe('Markdown routing with custom routes', function () {
  let request;

  beforeAll(async function () {
    const routesFilePath = path.join(
      configUtils.config.get('paths:appRoot'),
      'test/utils/fixtures/settings/markdown-routes.yaml',
    );

    await testUtils.startGhost({ routesFilePath });
    request = supertest.agent(configUtils.config.get('url'));
  });

  afterAll(function () {
    return testUtils.stopGhost();
  });

  it('redirects a collection data page to its routed markdown URL', async function () {
    const redirect = await request.get('/contact.md').redirects(0).expect(301);
    assert.equal(redirect.headers.location, '/rubrique.md');

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
});
