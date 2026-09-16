const assert = require('node:assert/strict');
const path = require('path');
const fs = require('fs');
const FormData = require('form-data');
const sinon = require('sinon');
const logging = require('@tryghost/logging');
const { agentProvider, fixtureManager, configUtils } = require('../../utils/e2e-framework');
const models = require('../../../core/server/models');
const settingsCache = require('../../../core/shared/settings-cache');
const urlServiceUtils = require('../../utils/url-service-utils');

// The page must not match the collection filter: the production bug only
// surfaces on sites whose collections are tag-filtered, because a page
// mis-typed 'posts' falls through every filtered collection to /404/.
// On an unfiltered (catch-all) collection the wrong type still lands on
// the same /:slug/ URL and the divergence is invisible.
const TAG_FILTERED_ROUTES = [
  'routes:',
  '',
  'collections:',
  '  /blog/:',
  '    permalink: /blog/{slug}/',
  '    filter: tag:hash-blog',
  '',
  'taxonomies:',
  '  tag: /tag/{slug}/',
  '  author: /author/{slug}/',
  '',
].join('\n');

async function uploadRoutes(adminAgent, routesYaml) {
  const formData = new FormData();
  formData.append('routes', routesYaml, {
    filename: 'routes.yaml',
    contentType: 'application/yaml',
  });
  await adminAgent.post('settings/routes/yaml/').body(formData).expectStatus(200);
  await urlServiceUtils.isFinished();
}

describe('Comments API lazy URL parity', function () {
  let membersAgent;
  let adminAgent;
  let page;
  let loggingErrorSpy;

  beforeAll(async function () {
    const agents = await agentProvider.getAgentsForMembers();
    membersAgent = agents.membersAgent;
    adminAgent = agents.adminAgent;

    await fixtureManager.init('posts', 'members');
    await adminAgent.loginAsOwner();

    await uploadRoutes(adminAgent, TAG_FILTERED_ROUTES);

    page = await models.Post.add(
      {
        title: 'Commented Page',
        slug: 'commented-page',
        type: 'page',
        status: 'published',
      },
      { context: { internal: true } },
    );

    await models.Comment.add({
      post_id: page.id,
      member_id: fixtureManager.get('members', 0).id,
      html: '<p>A comment on a page</p>',
      status: 'published',
    });
  });

  afterAll(async function () {
    // The DB suites share one process: put the default routes back so later
    // suites see the stock configuration.
    const defaultRoutes = fs.readFileSync(
      path.join(
        configUtils.config.get('paths:appRoot'),
        'test/utils/fixtures/settings/routes.yaml',
      ),
      'utf8',
    );
    await uploadRoutes(adminAgent, defaultRoutes);
  });

  beforeEach(function () {
    const getStub = sinon.stub(settingsCache, 'get');
    getStub.callsFake((key, options) => {
      if (key === 'comments_enabled') {
        return 'all';
      }
      return getStub.wrappedMethod.call(settingsCache, key, options);
    });
    loggingErrorSpy = sinon.spy(logging, 'error');
  });

  afterEach(function () {
    sinon.restore();
  });

  it('serializes a page comment URL without degrading to /404/', async function () {
    const { body } = await membersAgent
      .get(`/api/comments/post/${page.id}/?include=post`)
      .expectStatus(200);

    assert.equal(body.comments.length, 1);
    const url = body.comments[0].post.url;
    assert.match(url, /\/commented-page\/$/, `expected the page URL, got ${url}`);
    assert.doesNotMatch(url, /\/404\//);

    // A lazy failure is reported synchronously on the request path, but the
    // comments serializer resolves relations asynchronously — flush the check
    // phase so a report from that work is captured too.
    await new Promise((resolve) => {
      setImmediate(resolve);
    });
    await new Promise((resolve) => {
      setImmediate(resolve);
    });

    const resolutionErrors = loggingErrorSpy
      .getCalls()
      .map((call) => call.args[0])
      .filter((err) => err && err.code === 'LAZY_URL_RESOLUTION_ERROR');
    assert.deepEqual(
      resolutionErrors.map((err) => err.errorDetails),
      [],
      'URL service degraded to /404/ while serializing a page comment',
    );
  });
});
