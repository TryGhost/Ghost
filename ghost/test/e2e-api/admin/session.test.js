const {
  agentProvider,
  fixtureManager,
  matchers,
  configUtils,
  resetRateLimits,
} = require('../../utils/e2e-framework');
const { mockMail, assert, restore } = require('../../utils/e2e-framework-mock-manager');
const { anyContentVersion, anyEtag, stringMatching, anyUuid } = matchers;

describe('Sessions API', function () {
  let agent;

  beforeAll(async function () {
    agent = await agentProvider.getAdminAPIAgent();
    await fixtureManager.init();
  });

  it('can create session (log in) and access user data', async function () {
    const owner = await fixtureManager.get('users', 0);
    await agent
      .post('session/')
      .body({
        grant_type: 'password',
        username: owner.email,
        password: owner.password,
      })
      .expectStatus(201)
      .expectEmptyBody()
      .matchHeaderSnapshot({
        'content-version': anyContentVersion,
        etag: anyEtag,
        'set-cookie': [stringMatching(/^ghost-admin-api-session=/)],
      });

    await agent.get('/users/me/').expectStatus(200);
  });

  it('can delete session (log out) and requests will fail', async function () {
    await agent
      .delete('session/')
      .expectStatus(204)
      .expectEmptyBody()
      .matchHeaderSnapshot({
        'content-version': anyContentVersion,
        etag: anyEtag,
        'set-cookie': [stringMatching(/^ghost-admin-api-session=/)],
      });

    await agent.get('/users/me/').expectStatus(403);
  });

  describe('Staff 2FA', function () {
    let mail;

    beforeEach(async function () {
      configUtils.set('security:staffDeviceVerification', true);
      mail = mockMail();

      // Clear the per-user verification-email rate limiter so counts don't
      // accumulate across tests.
      await resetRateLimits();

      // Setup the agent & fixtures again, to ensure no cookies are set
      agent = await agentProvider.getAdminAPIAgent();
      await fixtureManager.init();
    });

    afterEach(async function () {
      configUtils.set('security:staffDeviceVerification', false);
      restore();
    });

    it('sends verification email if staffDeviceVerification is enabled', async function () {
      const owner = await fixtureManager.get('users', 0);

      await agent
        .post('session/')
        .body({
          grant_type: 'password',
          username: owner.email,
          password: owner.password,
        })
        .expectStatus(403)
        .matchBodySnapshot({
          errors: [
            {
              code: '2FA_NEW_DEVICE_DETECTED',
              id: anyUuid,
              message: 'User must verify session to login.',
              type: 'Needs2FAError',
            },
          ],
        })
        .matchHeaderSnapshot({
          'content-version': anyContentVersion,
          etag: anyEtag,
          'set-cookie': [stringMatching(/^ghost-admin-api-session=/)],
        });

      mail.assertSentEmailCount(1);
    });

    it('rate-limits verification emails per user across fresh sessions', async function () {
      const owner = await fixtureManager.get('users', 0);

      const login = () =>
        agent.post('session/').body({
          grant_type: 'password',
          username: owner.email,
          password: owner.password,
        });

      // send_verification_code_user freeRetries is 2 in the test config, so 3 sends are
      // allowed. Each attempt clears cookies to simulate the inbox-flooding
      // attack of repeating sign-in in a fresh session (which sidesteps any
      // per-session throttle).
      for (let i = 0; i < 3; i++) {
        agent.clearCookies();
        await login().expectStatus(403);
      }

      agent.clearCookies();
      await login()
        .expectStatus(429)
        .matchBodySnapshot({
          errors: [
            {
              id: anyUuid,
              message: stringMatching(/Too many verification emails requested/),
            },
          ],
        });

      // The blocked attempt must not have sent another email.
      mail.assertSentEmailCount(3);
    });

    it('clears the per-user verification-email limit after a successful sign-in', async function () {
      const owner = await fixtureManager.get('users', 0);

      const login = () =>
        agent.post('session/').body({
          grant_type: 'password',
          username: owner.email,
          password: owner.password,
        });

      // Send one code and complete verification, which resets the counter.
      await login().expectStatus(403);
      const email = assert.sentEmail({
        subject: /[0-9]{6} is your Ghost sign in verification code/,
      });
      const token = email.subject.match(/[0-9]{6}/)[0];
      await agent.put('session/verify').body({ token }).expectStatus(200);

      // With the counter reset, three more fresh-session sends all go through.
      // Without the reset, the third login would have been blocked (429), as
      // the login above already used one of the three allowed sends.
      for (let i = 0; i < 3; i++) {
        agent.clearCookies();
        await login().expectStatus(403);
      }
    });

    it('can verify a session with 2FA code', async function () {
      const owner = await fixtureManager.get('users', 0);
      await agent
        .post('session/')
        .body({
          grant_type: 'password',
          username: owner.email,
          password: owner.password,
        })
        .expectStatus(403)
        .matchBodySnapshot({
          errors: [
            {
              code: '2FA_NEW_DEVICE_DETECTED',
              id: anyUuid,
              message: 'User must verify session to login.',
              type: 'Needs2FAError',
            },
          ],
        })
        .matchHeaderSnapshot({
          'content-version': anyContentVersion,
          etag: anyEtag,
          'set-cookie': [stringMatching(/^ghost-admin-api-session=/)],
        });

      const email = assert.sentEmail({
        subject: /[0-9]{6} is your Ghost sign in verification code/,
      });

      const token = email.subject.match(/[0-9]{6}/)[0];
      await agent
        .put('session/verify')
        .body({
          token,
        })
        .expectStatus(200)
        .expectEmptyBody();
    });

    it('caps a challenge across IPs and sign-in, and allows a resent code', async function () {
      const owner = await fixtureManager.get('users', 0);
      const credentials = {
        grant_type: 'password',
        username: owner.email,
        password: owner.password,
      };
      await agent.post('session/').body(credentials).expectStatus(403);
      const token = assert
        .sentEmail({
          subject: /[0-9]{6} is your Ghost sign in verification code/,
        })
        .subject.match(/[0-9]{6}/)[0];

      for (let i = 0; i < 5; i++) {
        await agent
          .put('session/verify', { headers: { 'x-forwarded-for': `192.0.2.${i + 1}` } })
          .body({ token: 'wrong-code' })
          .expectStatus(401);
      }
      await agent
        .put('session/verify', { headers: { 'x-forwarded-for': '192.0.2.6' } })
        .body({ token })
        .expectStatus(429);
      await agent
        .post('session/', { headers: { 'x-forwarded-for': '192.0.2.7' } })
        .body({ ...credentials, token })
        .expectStatus(429);
      mail.assertSentEmailCount(1);

      await agent
        .post('session/verify', { headers: { 'x-forwarded-for': '192.0.2.8' } })
        .expectStatus(200);
      const freshToken = assert
        .sentEmail({
          subject: /[0-9]{6} is your Ghost sign in verification code/,
        })
        .subject.match(/[0-9]{6}/)[0];
      await agent
        .put('session/verify', { headers: { 'x-forwarded-for': '192.0.2.9' } })
        .body({ token: freshToken })
        .expectStatus(200);
      await agent.get('/users/me/').expectStatus(200);
    });

    it('rejects verification from a mismatched origin', async function () {
      const owner = await fixtureManager.get('users', 0);
      await agent
        .post('session/')
        .body({
          grant_type: 'password',
          username: owner.email,
          password: owner.password,
        })
        .expectStatus(403);

      const email = assert.sentEmail({
        subject: /[0-9]{6} is your Ghost sign in verification code/,
      });

      const token = email.subject.match(/[0-9]{6}/)[0];
      await agent
        .put('session/verify', {
          headers: {
            origin: 'https://attacker.example',
          },
        })
        .body({
          token,
        })
        .expectStatus(400);
    });

    it('rejects a 2FA code when reused in a fresh session', async function () {
      const owner = await fixtureManager.get('users', 0);

      // First login to trigger 2FA and get a verification code
      await agent
        .post('session/')
        .body({
          grant_type: 'password',
          username: owner.email,
          password: owner.password,
        })
        .expectStatus(403);

      const email = assert.sentEmail({
        subject: /[0-9]{6} is your Ghost sign in verification code/,
      });

      const token = email.subject.match(/[0-9]{6}/)[0];

      // Clear cookies to simulate fresh login attempt with token
      agent.clearCookies();

      // Login with token included from another session should still require verification
      await agent
        .post('session/')
        .body({
          grant_type: 'password',
          username: owner.email,
          password: owner.password,
          token,
        })
        .expectStatus(403)
        .matchBodySnapshot({
          errors: [
            {
              code: '2FA_NEW_DEVICE_DETECTED',
              id: anyUuid,
              message: 'User must verify session to login.',
              type: 'Needs2FAError',
            },
          ],
        })
        .matchHeaderSnapshot({
          'content-version': anyContentVersion,
          etag: anyEtag,
          'set-cookie': [stringMatching(/^ghost-admin-api-session=/)],
        });

      await agent
        .put('session/verify')
        .body({
          token,
        })
        .expectStatus(401)
        .expectEmptyBody();
    });

    it('requires 2FA again when a different user logs in after logout', async function () {
      // Seed staff users beyond the owner so we have a second account
      await fixtureManager.init('users');

      const owner = await fixtureManager.get('users', 0);
      const otherUser = await fixtureManager.get('users', 1);

      // Establish the second user as having logged in before, so their
      // later login is subject to device verification rather than the
      // first-login skip
      await agent
        .post('session/')
        .body({
          grant_type: 'password',
          username: otherUser.email,
          password: otherUser.password,
        })
        .expectStatus(201);
      await agent.delete('session/').expectStatus(204);

      // Owner logs in and completes device verification on this session
      await agent
        .post('session/')
        .body({
          grant_type: 'password',
          username: owner.email,
          password: owner.password,
        })
        .expectStatus(403);

      const ownerEmail = assert.sentEmail({
        subject: /[0-9]{6} is your Ghost sign in verification code/,
      });
      const ownerToken = ownerEmail.subject.match(/[0-9]{6}/)[0];

      await agent
        .put('session/verify')
        .body({
          token: ownerToken,
        })
        .expectStatus(200);

      // Owner logs out — in trusted-device mode logout keeps the
      // session's verified flag but clears the user
      await agent.delete('session/').expectStatus(204);

      // The second user logging in on the same session must verify again
      // rather than inheriting the owner's verification
      await agent
        .post('session/')
        .body({
          grant_type: 'password',
          username: otherUser.email,
          password: otherUser.password,
        })
        .expectStatus(403)
        .matchBodySnapshot({
          errors: [
            {
              code: '2FA_NEW_DEVICE_DETECTED',
              id: anyUuid,
              message: 'User must verify session to login.',
              type: 'Needs2FAError',
            },
          ],
        });
    });
  });
});
