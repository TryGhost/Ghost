const assert = require('node:assert/strict');
const { agentProvider, fixtureManager } = require('../utils/e2e-framework');

// Exercise the stored/rendered boundary: Admin keeps authoring data, while
// every public format and the website receive only the explicit public data.
describe('Add-on public data', function () {
  let adminAgent;
  let frontendAgent;
  let contentAPIAgent;
  let ghostServer;
  beforeAll(async function () {
    ({ adminAgent, frontendAgent, contentAPIAgent, ghostServer } =
      await agentProvider.getAgentsWithFrontend());
    await fixtureManager.init('posts', 'api_keys');
    await adminAgent.loginAsOwner();
    await contentAPIAgent.authenticate();
  });
  afterAll(async function () {
    await ghostServer?.stop();
  });

  it('keeps private authoring URLs out of all public formats', async function () {
    const secret = 'https://storage.example/private-episode-file.mp3';
    const lexical = JSON.stringify({
      root: {
        type: 'root',
        version: 1,
        direction: null,
        format: '',
        indent: 0,
        children: [
          {
            type: 'addon',
            version: 1,
            id: 'episode-one',
            addonHandle: 'podcast',
            blockName: 'episode',
            props: { full_audio: { url: secret } },
            publicProps: { label: 'Safe player' },
            html: '<p>Safe player</p>',
            portableHtml: '<p>Read this episode</p>',
            resourcePolicy: { images: [], media: [] },
            hydrate: true,
          },
        ],
      },
    });
    const created = await adminAgent
      .post('posts/')
      .body({
        posts: [
          {
            title: 'Public podcast data boundary',
            lexical,
            status: 'published',
          },
        ],
      })
      .expectStatus(201);
    const post = created.body.posts[0];
    const saved = await adminAgent.get(`posts/${post.id}/?formats=lexical`).expectStatus(200);
    assert.ok(saved.body.posts[0].lexical.includes(secret));
    for (const query of [
      'formats=html,plaintext,mobiledoc,lexical',
      'fields=html,plaintext,mobiledoc,lexical',
    ]) {
      const response = await contentAPIAgent.get(`posts/${post.id}/?${query}`).expectStatus(200);
      assert.ok(!JSON.stringify(response.body).includes(secret));
      assert.equal(response.body.posts[0].lexical, undefined);
      assert.equal(response.body.posts[0].mobiledoc, undefined);
      assert.ok(response.body.posts[0].html.includes('Safe player'));
    }
    const website = await frontendAgent.get(`/${post.slug}/`).expect(200);
    assert.ok(website.text.includes('Safe player'));
    assert.ok(!website.text.includes(secret));
  });
});
