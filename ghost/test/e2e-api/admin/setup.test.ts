import assert from 'node:assert/strict';

const { agentProvider, fixtureManager } = require('../../utils/e2e-framework');
const { mockMail, restore } = require('../../utils/e2e-framework-mock-manager');
const settingsCache = require('../../../core/shared/settings-cache');
const models = require('../../../core/server/models');

const owner = { name: 'Owner', email: 'setup-owner@example.com', password: 'thisissupersafe' };

describe('Setup API', function () {
  let agent: {
    get(path: string): any;
    post(path: string): any;
    put(path: string): any;
    loginAsOwner(): Promise<void>;
    loginAsAdmin(): Promise<void>;
  };

  beforeEach(async function () {
    // A fresh agent resets the database, so the site is not set up
    agent = await agentProvider.getAdminAPIAgent();
  });

  // The welcome email is sent after the response, so the mock outlives each test
  beforeAll(function () {
    mockMail();
  });

  afterAll(function () {
    restore();
  });

  async function isSetup() {
    const { body } = await agent.get('authentication/setup').expectStatus(200);
    return body.setup[0].status;
  }

  it('completes setup', async function () {
    const { body } = await agent
      .post('authentication/setup')
      .body({ setup: [{ ...owner, blogTitle: ' A blog ' }] })
      .expectStatus(201);

    assert.equal(body.users[0].email, owner.email);
    assert.equal(await isSetup(), true);
    assert.equal(settingsCache.get('title'), 'A blog');
  });

  it('rewrites the sample posts with the site details', async function () {
    await agent
      .post('authentication/setup')
      .body({ setup: [{ ...owner, blogTitle: 'A blog' }] })
      .expectStatus(201);

    // The doFixtures unit tests cover the ordering; the test fixtures only include the about page
    const about = await models.Post.findOne({ slug: 'about' }, { require: true });

    assert.match(about.get('html'), /A blog is an independent publication launched in .+ by Owner/);
    assert.doesNotMatch(about.get('html'), /{{/);
  });

  for (const blogTitle of [undefined, 42, '', null, 'a'.repeat(151)]) {
    it(`rejects blogTitle ${String(JSON.stringify(blogTitle)).slice(0, 12)} before creating the owner`, async function () {
      const { body } = await agent
        .post('authentication/setup')
        .body({ setup: [{ ...owner, blogTitle }] })
        .expectStatus(422);

      assert.equal(body.errors[0].property, 'body.setup.0.blogTitle');
      assert.equal(await isSetup(), false);
    });
  }

  it('counts an emoji in the title as one character, as Admin does', async function () {
    const blogTitle = `${'a'.repeat(149)}🎉`;

    await agent
      .post('authentication/setup')
      .body({ setup: [{ ...owner, blogTitle }] })
      .expectStatus(201);

    assert.equal(settingsCache.get('title'), blogTitle);
  });

  it('rejects an oversized description before creating the owner', async function () {
    const { body } = await agent
      .post('authentication/setup')
      .body({ setup: [{ ...owner, blogTitle: 'A blog', description: 'a'.repeat(201) }] })
      .expectStatus(422);

    assert.equal(body.errors[0].property, 'body.setup.0.description');
    assert.equal(await isSetup(), false);
  });

  it('trims the description before checking its length', async function () {
    const description = 'a'.repeat(200);

    await agent
      .post('authentication/setup')
      .body({ setup: [{ ...owner, blogTitle: 'A blog', description: `${description} ` }] })
      .expectStatus(201);

    assert.equal(settingsCache.get('description'), description);
  });

  it('accepts null for the optional details', async function () {
    await agent
      .post('authentication/setup')
      .body({
        setup: [
          { ...owner, blogTitle: 'A blog', theme: null, accentColor: null, description: null },
        ],
      })
      .expectStatus(201);
  });

  it('rejects a body without the setup details', async function () {
    await agent.post('authentication/setup').body({}).expectStatus(422);

    assert.equal(await isSetup(), false);
  });

  describe('update', function () {
    beforeEach(async function () {
      await fixtureManager.init('users');
    });

    it('updates the owner without a blogTitle and leaves the title alone', async function () {
      await agent.loginAsOwner();
      const title = settingsCache.get('title');

      const { body } = await agent
        .put('authentication/setup')
        .body({ setup: [owner] })
        .expectStatus(200);

      assert.equal(body.users[0].email, owner.email);
      assert.equal(settingsCache.get('title'), title);
    });

    it('rejects a blogTitle that is not a string', async function () {
      await agent.loginAsOwner();

      const { body } = await agent
        .put('authentication/setup')
        .body({ setup: [{ ...owner, blogTitle: 42 }] })
        .expectStatus(422);

      assert.equal(body.errors[0].property, 'body.setup.0.blogTitle');
    });

    it('rejects a user who is not the owner', async function () {
      await agent.loginAsAdmin();

      await agent
        .put('authentication/setup')
        .body({ setup: [{ ...owner, blogTitle: 'A blog' }] })
        .expectStatus(403);
    });
  });
});
