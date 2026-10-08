const {
  agentProvider,
  fixtureManager,
  matchers,
  configUtils,
} = require('../../utils/e2e-framework');
const { mockMail, restore } = require('../../utils/e2e-framework-mock-manager');
const models = require('../../../core/server/models');
const security = require('@tryghost/security');
const settingsCache = require('../../../core/shared/settings-cache');
const moment = require('moment');
const assert = require('node:assert/strict');
const { anyErrorId } = matchers;

describe('Authentication API', function () {
  let agent;

  beforeAll(async function () {
    agent = await agentProvider.getAdminAPIAgent();
    await fixtureManager.init('users');
    await agent.loginAsOwner();
  });

  describe('generateResetToken', function () {
    it('Cannot generate reset token without required info', async function () {
      await agent
        .post('authentication/password_reset')
        .expectStatus(400)
        .matchBodySnapshot({
          errors: [
            {
              id: anyErrorId,
            },
          ],
        });
    });

    it('Cannot generate a reset token for a suspended user', async function () {
      const suspendedUser = await fixtureManager.get('users', 1);

      await models.User.edit(
        { status: 'inactive' },
        { id: suspendedUser.id, context: { internal: true } },
      );

      try {
        await agent
          .post('authentication/password_reset')
          .body({
            password_reset: [
              {
                email: suspendedUser.email,
              },
            ],
          })
          .expectStatus(403)
          .matchBodySnapshot({
            errors: [
              {
                id: anyErrorId,
              },
            ],
          });
      } finally {
        await models.User.edit(
          { status: 'active' },
          { id: suspendedUser.id, context: { internal: true } },
        );
      }
    });
  });

  describe('resetPassword', function () {
    let mail;

    beforeEach(function () {
      mail = mockMail();
    });

    afterEach(function () {
      configUtils.set('security:staffDeviceVerification', false);
      restore();
    });

    it('creates a verified session after password reset', async function () {
      // Enable 2FA for this test
      configUtils.set('security:staffDeviceVerification', true);

      const ownerUser = await fixtureManager.get('users', 0);
      const newPassword = 'thisissupersafe';

      // Generate a valid reset token manually (simulating the email link)
      const dbHash = settingsCache.get('db_hash');
      const user = await models.User.getByEmail(ownerUser.email, { context: { internal: true } });
      const resetToken = security.tokens.resetToken.generateHash({
        expires: moment().add(1, 'days').valueOf(),
        email: ownerUser.email,
        dbHash: dbHash,
        password: user.get('password'),
      });
      const encodedToken = security.url.encodeBase64(resetToken);

      // Reset should start from an unauthenticated session.
      agent.clearCookies();

      // Reset the password and verify response mode
      await agent
        .put('authentication/password_reset')
        .body({
          password_reset: [
            {
              token: encodedToken,
              newPassword: newPassword,
              ne2Password: newPassword,
            },
          ],
        })
        .expectStatus(200)
        .matchBodySnapshot({
          password_reset: [
            {
              message: 'Password updated',
            },
          ],
        });

      // Verify we can access protected resources (session is verified)
      await agent.get('/users/me/').expectStatus(200);
    });

    describe('staff account status', function () {
      let user;

      beforeEach(async function () {
        agent = await agentProvider.getAdminAPIAgent();
        await fixtureManager.init('users');
        const staffUser = fixtureManager.get('users', 1);
        user = await models.User.getByEmail(staffUser.email, { context: { internal: true } });
      });

      async function requestResetToken() {
        await agent
          .post('authentication/password_reset')
          .body({ password_reset: [{ email: user.get('email') }] })
          .expectStatus(200);

        mail.assertSentEmailCount(1);
        const email = mail.getSentEmail();
        const resetLink = email.text.match(/\/reset\/([^/]+)\//);
        assert.ok(resetLink, 'the email should contain a password reset link');
        return resetLink[1];
      }

      it('allows a locked user to request and redeem a password reset', async function () {
        await user.lock({ context: { internal: true } });
        const token = await requestResetToken();
        const newPassword = 'thisissupersafe-after-reset';

        await agent
          .put('authentication/password_reset')
          .body({
            password_reset: [{ token, newPassword, ne2Password: newPassword }],
          })
          .expectStatus(200);

        const updatedUser = await models.User.getByEmail(user.get('email'), {
          context: { internal: true },
        });
        assert.equal(updatedUser.get('status'), 'active');
        assert.equal(
          await security.password.compare(newPassword, updatedUser.get('password')),
          true,
        );

        const { body } = await agent.get('/users/me/').expectStatus(200);
        assert.equal(body.users[0].id, user.id);
      });

      it('rejects a reset token issued before the user was suspended', async function () {
        const token = await requestResetToken();
        const originalPassword = user.get('password');
        await models.User.edit(
          { status: 'inactive' },
          { id: user.id, context: { internal: true } },
        );
        const newPassword = 'thisissupersafe-after-reset';

        const { body } = await agent
          .put('authentication/password_reset')
          .body({
            password_reset: [{ token, newPassword, ne2Password: newPassword }],
          })
          .expectStatus(403);
        assert.equal(body.errors[0].type, 'NoPermissionError');
        assert.equal(body.errors[0].message, 'This account has been suspended.');

        const suspendedUser = await models.User.getByEmail(user.get('email'), {
          context: { internal: true },
        });
        assert.equal(suspendedUser.get('status'), 'inactive');
        assert.equal(suspendedUser.get('password'), originalPassword);
        await agent.get('/users/me/').expectStatus(403);
      });
    });
  });
});
