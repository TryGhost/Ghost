const assert = require('node:assert/strict');
const supertest = require('supertest');
const {
  agentProvider,
  fixtureManager,
  matchers: { anyContentVersion, anyEtag },
  dbUtils,
  configUtils,
  resetRateLimits,
} = require('../../utils/e2e-framework');

describe('Sessions API', function () {
  let agent;

  beforeAll(async function () {
    agent = await agentProvider.getAdminAPIAgent();
    await fixtureManager.init();
  });

  it('Is rate limited to protect against brute forcing a users password', async function () {
    await dbUtils.truncate('rate_limits');
    // +1 because this is a retry count, so we have one request + the retries, then blocked
    const userLoginRateLimit = configUtils.config.get('spam').user_login.freeRetries + 1;

    for (let i = 0; i < userLoginRateLimit; i++) {
      await agent.post('session/').body({
        grant_type: 'password',
        username: 'user@domain.tld',
        password: 'parseword',
      });
    }

    await agent
      .post('session/')
      .body({
        grant_type: 'password',
        username: 'user@domain.tld',
        password: 'parseword',
      })
      .expectStatus(429)
      .matchHeaderSnapshot({
        'content-version': anyContentVersion,
        etag: anyEtag,
      });
  });

  it('Is rate limited to protect against brute forcing whether a user exists', async function () {
    await dbUtils.truncate('rate_limits');
    // +1 because this is a retry count, so we have one request + the retries, then blocked
    const userLoginRateLimit = configUtils.config.get('spam').user_login.freeRetries + 1;

    for (let i = 0; i < userLoginRateLimit; i++) {
      await agent.post('session/').body({
        grant_type: 'password',
        username: `user+${i}@domain.tld`,
        password: `parseword`,
      });
    }

    await agent
      .post('session/')
      .body({
        grant_type: 'password',
        username: 'user@domain.tld',
        password: 'parseword',
      })
      .expectStatus(429)
      .matchHeaderSnapshot({
        'content-version': anyContentVersion,
        etag: anyEtag,
      });
  });

  it('Shares the global login limit across spellings of the session path', async function () {
    const spam = configUtils.config.get('spam');
    const globalRetries = spam.global_block.freeRetries;
    const loginRetries = spam.user_login.freeRetries;

    // The test agent always appends a trailing slash, so send raw requests
    const login = (path) =>
      supertest(agent.app).post(`/ghost/api/admin/${path}`).set(agent.defaults.headers).send({
        grant_type: 'password',
        username: 'user@domain.tld',
        password: 'parseword',
      });

    try {
      configUtils.set('spam:global_block:freeRetries', 3);
      configUtils.set('spam:user_login:freeRetries', 100);
      await resetRateLimits();

      for (const path of ['session', 'session/', 'SESSION', 'Session/']) {
        assert.equal((await login(path)).status, 404);
      }

      assert.equal((await login('session')).status, 429);
    } finally {
      configUtils.set('spam:global_block:freeRetries', globalRetries);
      configUtils.set('spam:user_login:freeRetries', loginRetries);
      await resetRateLimits();
    }
  });
});
