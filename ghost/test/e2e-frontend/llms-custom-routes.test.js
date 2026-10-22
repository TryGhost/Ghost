const assert = require('node:assert/strict');
const FormData = require('form-data');
const sinon = require('sinon');
const settingsCache = require('../../core/shared/settings-cache');
const configUtils = require('../utils/config-utils');
const { agentProvider, fixtureManager } = require('../utils/e2e-framework');

const entries = [
  { kind: 'page', slug: 'about', route: '/questions/about-this-site/', title: 'About this site' },
  {
    kind: 'post',
    slug: 'welcome',
    route: '/questions/getting-started/',
    title: 'Start here for a quick overview of everything you need to know',
  },
];

describe('llms.txt with data-bound custom routes', function () {
  let request;
  let adminAgent;
  let ghostServer;
  let siteUrl;

  beforeAll(async function () {
    const agents = await agentProvider.getAgentsWithFrontend();
    request = agents.frontendAgent;
    adminAgent = agents.adminAgent;
    ghostServer = agents.ghostServer;
    siteUrl = configUtils.config.get('url').replace(/\/$/, '');

    await fixtureManager.init();
    await agents.adminAgent.loginAsOwner();

    const routes = new FormData();
    routes.append(
      'routes',
      `routes:
  /questions/about-this-site/:
    template: page
    data: page.about
  /questions/getting-started/:
    template: post
    data: post.welcome
collections:
  /:
    permalink: /{slug}/
    template: index
taxonomies:
  tag: /tag/{slug}/
  author: /author/{slug}/
`,
      {
        filename: 'routes.yaml',
        contentType: 'application/yaml',
      },
    );
    await agents.adminAgent.post('settings/routes/yaml/').body(routes).expectStatus(200);
  });

  afterEach(function () {
    sinon.restore();
  });

  afterAll(async function () {
    await ghostServer?.stop();
  });

  it('redirects custom Markdown URLs to HTML when llms.txt is disabled', async function () {
    sinon.stub(settingsCache, 'get').callThrough().withArgs('llms_enabled').returns(false);
    await request
      .get('/questions/about-this-site.md?source=llms')
      .expect(302)
      .expect('Location', '/questions/about-this-site/?source=llms');
  });

  it('strips gift tokens from custom Markdown URLs', async function () {
    await request
      .get('/questions/getting-started.md?gift=invalid&source=llms')
      .expect(301)
      .expect('Location', '/questions/getting-started.md?source=llms');
  });

  it('keeps members-only content gated on custom Markdown URLs', async function () {
    const response = await adminAgent.get('pages/?filter=slug:about').expectStatus(200);
    const page = response.body.pages[0];
    const gated = await adminAgent
      .put(`pages/${page.id}/`)
      .body({
        pages: [{ id: page.id, updated_at: page.updated_at, visibility: 'members' }],
      })
      .expectStatus(200);
    try {
      const res = await request.get('/questions/about-this-site.md').expect(200);
      assert.match(res.headers['content-type'], /text\/markdown/);
      assert.match(res.text, /This page is for subscribers only/);
      assert.doesNotMatch(res.text, /An about page is a great example/);
    } finally {
      await adminAgent
        .put(`pages/${page.id}/`)
        .body({
          pages: [
            { id: page.id, updated_at: gated.body.pages[0].updated_at, visibility: 'public' },
          ],
        })
        .expectStatus(200);
    }
  });

  for (const { kind, slug, route, title } of entries) {
    const customMarkdownPath = `${route.slice(0, -1)}.md`;

    it(`serves the ${kind} at its custom HTML route`, async function () {
      await request.get(`/${slug}/`).expect(301).expect('Location', route);
      const res = await request.get(route).expect('Content-Type', /html/).expect(200);
      assert.ok(res.text.includes(title));
    });

    it(`serves the ${kind} Markdown link published in llms.txt`, async function () {
      const index = await request.get('/llms.txt').expect(200);
      const line = index.text.split('\n').find((value) => value.startsWith(`- [${title}](`));
      assert.ok(line, `expected the ${kind} in llms.txt`);
      const link = line.match(/\]\((https?:\/\/[^)]+)\)/);
      assert.ok(link, `expected an absolute Markdown URL for the ${kind}`);

      const markdownPath = new URL(link[1]).pathname;
      for (const query of ['', '?source=llms']) {
        const res = await request
          .get(`${markdownPath}${query}`)
          .expect(200)
          .expect('Content-Type', /text\/markdown/);
        assert.ok(res.text.includes(`# ${title}`));
      }
    });

    it(`publishes the ${kind}'s custom Markdown URL in llms.txt`, async function () {
      const index = await request.get('/llms.txt').expect(200);
      assert.ok(index.text.includes(`[${title}](${siteUrl}${customMarkdownPath})`));
    });

    it(`serves Markdown at the ${kind}'s custom route`, async function () {
      const res = await request.get(customMarkdownPath).expect(200);
      assert.match(res.headers['content-type'], /text\/markdown/);
      assert.equal(res.headers['content-location'], customMarkdownPath);
      assert.ok(res.text.includes(`# ${title}`));
    });

    it(`preserves Markdown and query parameters when redirecting the ${kind}`, async function () {
      await request
        .get(`/${slug}.md?source=llms`)
        .expect(301)
        .expect('Location', `${customMarkdownPath}?source=llms`);
    });
  }
});
