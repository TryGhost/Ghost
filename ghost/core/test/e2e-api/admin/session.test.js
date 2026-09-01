const nodeAssert = require('node:assert/strict');
const {
  agentProvider,
  fixtureManager,
  matchers,
  configUtils,
} = require('../../utils/e2e-framework');
const { mockMail, assert, restore } = require('../../utils/e2e-framework-mock-manager');
const models = require('../../../core/server/models');
const passkeys = require('../../../core/server/services/passkeys');
const urlUtils = require('../../../core/shared/url-utils').default;
const sinon = require('sinon');
const { anyContentVersion, anyEtag, stringMatching, anyUuid } = matchers;

const authenticationResponse = {
  id: 'staff-passkey',
  rawId: 'staff-passkey',
  response: {
    clientDataJSON: 'client-data',
    authenticatorData: 'authenticator-data',
    signature: 'signature',
  },
  clientExtensionResults: {},
  type: 'public-key',
};

describe('Sessions API', function () {
  let agent;

  beforeAll(async function () {
    agent = await agentProvider.getAdminAPIAgent();
    await fixtureManager.init();
  });

  afterEach(function () {
    sinon.restore();
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

  it('can list and remove passkeys owned by the signed-in user', async function () {
    const owner = await fixtureManager.get('users', 0);
    await agent
      .post('session/')
      .body({
        grant_type: 'password',
        username: owner.email,
        password: owner.password,
      })
      .expectStatus(201);

    const credential = await models.PasskeyCredential.add({
      user_id: owner.id,
      member_id: null,
      credential_id: 'test-credential',
      credential_id_hash: 'a'.repeat(64),
      rp_id: new URL(urlUtils.getAdminUrl() || urlUtils.getSiteUrl()).hostname,
      public_key: 'test-public-key',
      counter: 0,
      backed_up: false,
      name: 'Test passkey',
    });

    const { body } = await agent.get('session/passkeys').expectStatus(200);
    nodeAssert.equal(body.passkeys.length, 1);
    nodeAssert.equal(body.passkeys[0].id, credential.id);
    nodeAssert.equal(body.passkeys[0].name, 'Test passkey');

    await agent.delete(`session/passkeys/${credential.id}`).expectStatus(204).expectEmptyBody();
    const { body: emptyBody } = await agent.get('session/passkeys').expectStatus(200);
    nodeAssert.deepEqual(emptyBody.passkeys, []);
  });

  it('cannot remove a passkey owned by another user', async function () {
    agent = await agentProvider.getAdminAPIAgent();
    await fixtureManager.init();
    const owner = await fixtureManager.get('users', 0);
    await agent
      .post('session/')
      .body({
        grant_type: 'password',
        username: owner.email,
        password: owner.password,
      })
      .expectStatus(201);

    const otherUser = await models.User.add({
      name: 'Other passkey owner',
      slug: 'other-passkey-owner',
      email: 'other-passkey-owner@example.com',
      password: 'Sl1m3rson99',
      status: 'active',
    });

    const credential = await models.PasskeyCredential.add({
      user_id: otherUser.id,
      member_id: null,
      credential_id: 'other-user-credential',
      credential_id_hash: 'b'.repeat(64),
      rp_id: new URL(urlUtils.getAdminUrl() || urlUtils.getSiteUrl()).hostname,
      public_key: 'test-public-key',
      counter: 0,
      backed_up: false,
      name: 'Other user passkey',
    });

    await agent.delete(`session/passkeys/${credential.id}`).expectStatus(404);
    const persisted = await models.PasskeyCredential.findOne({
      id: credential.id,
    });
    nodeAssert.ok(persisted);
    await models.PasskeyCredential.destroy({ id: credential.id });
  });

  it('can create a verified staff session with a passkey only', async function () {
    agent = await agentProvider.getAdminAPIAgent();
    agent.clearCookies();
    const owner = await fixtureManager.get('users', 0);
    await models.User.edit({ status: 'active' }, { id: owner.id });
    const activeUser = await models.User.findOne({
      id: owner.id,
      status: 'all',
    });
    nodeAssert.equal(activeUser.isActive(), true);
    const activeUserId = activeUser.get('id');
    sinon.stub(passkeys, 'authenticationOptions').resolves({
      options: { challenge: 'passwordless-staff-challenge' },
    });
    sinon.stub(passkeys, 'createCeremonyToken').returns('signed-staff-ceremony');
    sinon.stub(passkeys, 'verifyCeremonyToken').returns({
      id: 'staff-ceremony-id',
      challenge: 'passwordless-staff-challenge',
      issued: Date.now(),
      subjectId: null,
    });
    const authenticate = sinon.stub(passkeys, 'authenticate').resolves({ userId: activeUserId });

    const { body } = await agent.post('session/passkeys/authentication').expectStatus(200);
    nodeAssert.equal(body.challenge, 'passwordless-staff-challenge');
    nodeAssert.equal(body.ceremony, 'signed-staff-ceremony');

    await agent
      .put('session/passkeys/authentication')
      .body({ response: authenticationResponse, ceremony: body.ceremony })
      .expectStatus(201)
      .expectEmptyBody();

    nodeAssert.equal(authenticate.firstCall.args[0].audience, 'staff');
    nodeAssert.equal(
      authenticate.firstCall.args[0].expectedChallenge,
      'passwordless-staff-challenge',
    );
    nodeAssert.equal(authenticate.firstCall.args[0].ceremonyId, 'staff-ceremony-id');
    await agent.get('/users/me/').expectStatus(200);
  });

  describe('Staff 2FA', function () {
    let mail;

    beforeEach(async function () {
      configUtils.set('security:staffDeviceVerification', true);
      mail = mockMail();

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
