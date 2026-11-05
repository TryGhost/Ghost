import assert from 'node:assert/strict';
import FormData from 'form-data';
import type supertest from 'supertest';
import type { GhostServer } from '../../core/server/ghost-server';

// Share the CommonJS instances used by boot and the database test setup.
const config: typeof import('../../core/shared/config') = require('../../core/shared/config');
const {
  agentProvider,
  fixtureManager,
}: typeof import('../utils/e2e-framework') = require('../utils/e2e-framework');

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
  let request: ReturnType<typeof supertest.agent>;
  let ghostServer: GhostServer | undefined;
  let siteUrl: string;

  beforeAll(async function () {
    const agents = await agentProvider.getAgentsWithFrontend();
    request = agents.frontendAgent;
    ghostServer = agents.ghostServer;
    siteUrl = config.get('url').replace(/\/$/, '');

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

  afterAll(async function () {
    await ghostServer?.stop();
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

      const markdownUrl = new URL(link[1]);
      assert.equal(markdownUrl.origin, new URL(siteUrl).origin);
      const markdownPath = markdownUrl.pathname;
      for (const query of ['', '?source=llms']) {
        const res = await request
          .get(`${markdownPath}${query}`)
          .expect(200)
          .expect('Content-Type', /text\/markdown/);
        assert.ok(res.text.includes(`# ${title}`));
      }
    });

    // Known failures: custom Markdown URLs are not supported yet.
    // Vitest runs these assertions and fails the suite if they unexpectedly pass.
    it.fails(`publishes the ${kind}'s custom Markdown URL in llms.txt`, async function () {
      const index = await request.get('/llms.txt').expect(200);
      assert.ok(index.text.includes(`[${title}](${siteUrl}${customMarkdownPath})`));
    });

    it.fails(`serves Markdown at the ${kind}'s custom route`, async function () {
      const res = await request.get(customMarkdownPath).expect(200);
      assert.match(res.headers['content-type'], /text\/markdown/);
      assert.equal(res.headers['content-location'], customMarkdownPath);
      assert.ok(res.text.includes(`# ${title}`));
    });

    it.fails(`preserves Markdown and query parameters when redirecting the ${kind}`, async function () {
      await request
        .get(`/${slug}.md?source=llms`)
        .expect(301)
        .expect('Location', `${customMarkdownPath}?source=llms`);
    });
  }
});
