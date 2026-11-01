const assert = require('node:assert/strict');
const sinon = require('sinon');
const { agentProvider, fixtureManager } = require('../../utils/e2e-framework');
const adapterManager = require('../../../core/server/services/adapter-manager').default;

const SIGNIN_URL = 'https://idp.example.com/ghost/start';

function assertPasswordSigninDisabled({ body }) {
  assert.equal(body.errors[0].type, 'NoPermissionError');
  assert.equal(body.errors[0].message, 'Password sign-in is disabled, sign in with SSO instead');
}

describe('SSO sign-in', function () {
  let agent;
  let owner;

  beforeAll(async function () {
    agent = await agentProvider.getAdminAPIAgent();
    await fixtureManager.init();
    owner = await fixtureManager.get('users', 0);
  });

  afterEach(function () {
    sinon.restore();
  });

  describe('without a sign-in URL', function () {
    it('allows password sign-in', async function () {
      await agent
        .post('session/')
        .body({ grant_type: 'password', username: owner.email, password: owner.password })
        .expectStatus(201);
    });

    it('does not expose an SSO sign-in URL', async function () {
      await agent
        .get('site/')
        .expectStatus(200)
        .expect(({ body }) => {
          assert.equal(body.site.sso_signin_url, undefined);
          assert.equal(body.site.sso_signin_label, undefined);
        });
    });
  });

  describe('with a sign-in page from the SSO adapter', function () {
    beforeAll(async function () {
      await agent.loginAsOwner();
    });

    beforeEach(function () {
      sinon.stub(adapterManager.getAdapter('sso'), 'getSigninPage').returns({
        url: SIGNIN_URL,
        label: 'Sign in with Example →',
      });
    });

    it('exposes the sign-in URL and label', async function () {
      await agent
        .get('site/')
        .expectStatus(200)
        .expect(({ body }) => {
          assert.equal(body.site.sso_signin_url, SIGNIN_URL);
          assert.equal(body.site.sso_signin_label, 'Sign in with Example →');
        });
    });

    it('keeps existing sessions working', async function () {
      await agent.get('users/me/').expectStatus(200);
    });

    it('blocks password sign-in', async function () {
      await agent
        .post('session/')
        .body({ grant_type: 'password', username: owner.email, password: owner.password })
        .expectStatus(403)
        .expect(assertPasswordSigninDisabled);
    });

    it('blocks sign-in verification', async function () {
      await agent.post('session/verify/').expectStatus(403).expect(assertPasswordSigninDisabled);
      await agent
        .put('session/verify/')
        .body({ token: '123456' })
        .expectStatus(403)
        .expect(assertPasswordSigninDisabled);
    });

    it('blocks password resets', async function () {
      await agent
        .post('authentication/password_reset/')
        .body({ password_reset: [{ email: owner.email }] })
        .expectStatus(403)
        .expect(assertPasswordSigninDisabled);
      await agent
        .put('authentication/password_reset/')
        .body({
          password_reset: [
            { token: 'token', newPassword: 'n3wPassw0rd!', ne2Password: 'n3wPassw0rd!' },
          ],
        })
        .expectStatus(403)
        .expect(assertPasswordSigninDisabled);
    });

    it('blocks accepting invites', async function () {
      await agent
        .post('authentication/invitation/')
        .body({
          invitation: [
            {
              token: 'token',
              email: 'invited@example.com',
              password: 'n3wPassw0rd!',
              name: 'Invited',
            },
          ],
        })
        .expectStatus(403)
        .expect(assertPasswordSigninDisabled);
    });

    it('blocks creating invites', async function () {
      const role = await fixtureManager.get('roles', 1);

      await agent
        .post('invites/')
        .body({ invites: [{ email: 'invited@example.com', role_id: role.id }] })
        .expectStatus(403)
        .expect(assertPasswordSigninDisabled);
    });

    it('blocks changing passwords', async function () {
      await agent
        .put('users/password/')
        .body({
          password: [
            {
              user_id: owner.id,
              oldPassword: owner.password,
              newPassword: 'n3wPassw0rd!',
              ne2Password: 'n3wPassw0rd!',
            },
          ],
        })
        .expectStatus(403)
        .expect(assertPasswordSigninDisabled);
    });

    it('leaves setup status readable', async function () {
      await agent.get('authentication/setup/').expectStatus(200);
    });

    it('allows resetting authentication', async function () {
      await agent
        .post('authentication/reset/')
        .expectStatus(200)
        .expect(({ body }) => {
          assert.ok(body.security_action[0].users_locked > 0);
        });
    });
  });
});
