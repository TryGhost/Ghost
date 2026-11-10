const assert = require('node:assert/strict');
const { assertExists } = require('../../../../utils/assertions');
const sinon = require('sinon');
const express = require('express');
const errors = require('@tryghost/errors');
const createSessionService = require('../../../../../core/server/auth/session/session-service');
const { RateLimiterMemory } = require('rate-limiter-flexible');
const {
  BackoffLimiter,
} = require('../../../../../core/server/web/shared/middleware/api/backoff-limiter');
const defaults = require('../../../../../core/shared/config/defaults.json');

// Most tests exercise session behavior independently of the email and challenge budgets.
// Limiter tests override these stubs with the behavior they need to verify.
const SessionService = (options) =>
  createSessionService({
    limitVerificationEmailForUser: sinon.stub().resolves(),
    resetVerificationEmailForUser: sinon.stub().resolves(),
    consumeAuthCodeAttempt: sinon.stub().resolves(),
    ...options,
  });

// Mimics express-session, where regenerate swaps in a brand new session object
function createGetSession(initialProps = {}) {
  return async function getSession(req) {
    if (!req.session) {
      const destroy = sinon.spy((cb) => cb());
      const regenerate = sinon.spy((cb) => {
        req.session = { destroy, regenerate };
        cb();
      });
      req.session = { destroy, regenerate, ...initialProps };
    }
    return req.session;
  };
}

describe('SessionService', function () {
  let getSettingsCache;
  let urlUtils;

  beforeEach(function () {
    getSettingsCache = sinon.stub();
    getSettingsCache.withArgs('require_email_mfa').returns(false);
    getSettingsCache.withArgs('title').returns('Test Title');
    getSettingsCache.withArgs('admin_session_secret').returns('secret-key');
    urlUtils = {
      getAdminUrl: sinon.stub().returns('https://admin.example.com'),
      getSiteUrl: sinon.stub().returns('https://example.com'),
      urlFor: sinon.stub().returns('https://example.com'),
    };
  });

  it('Returns the user for the id stored on the session', async function () {
    const getSession = createGetSession();

    const findUserById = sinon.spy(async ({ id }) => ({ id }));
    const getOriginOfRequest = sinon.stub().returns('https://admin.example.com');

    const isStaffDeviceVerificationDisabled = sinon.stub().returns(false);

    const sessionService = SessionService({
      getSession,
      findUserById,
      getOriginOfRequest,
      getSettingsCache,
      isStaffDeviceVerificationDisabled,
      urlUtils,
    });

    const req = Object.create(express.request, {
      ip: {
        value: '0.0.0.0',
      },
      headers: {
        value: {
          cookie: 'thing',
        },
      },
      get: {
        value: () => 'https://admin.example.com',
      },
    });
    const res = Object.create(express.response);
    const user = { id: 'egg' };

    await sessionService.createSessionForUser(req, res, user);

    assert.equal(req.session.user_id, 'egg');

    const actualUser = await sessionService.getUserForSession(req, res);
    sinon.assert.calledWith(findUserById, sinon.match({ id: 'egg' }));

    const expectedUser = await findUserById.returnValues[0];
    assert.equal(actualUser, expectedUser);

    await sessionService.removeUserForSession(req, res);
    assert.equal(req.session.user_id, undefined);

    const removedUser = await sessionService.getUserForSession(req, res);
    assert.equal(removedUser, null);
  });

  it('Throws an error when the csrf verification fails due to non-admin origin', async function () {
    const getSession = async (req) => {
      if (req.session) {
        return req.session;
      }
      req.session = {
        origin: 'https://admin.example.com',
      };
      return req.session;
    };
    const findUserById = sinon.spy(async ({ id }) => ({ id }));
    const getOriginOfRequest = sinon.stub().returns('https://evil.com');

    const sessionService = SessionService({
      getSession,
      findUserById,
      getOriginOfRequest,
      urlUtils,
    });

    const req = Object.create(express.request, {
      ip: {
        value: '0.0.0.0',
      },
      headers: {
        value: {
          cookie: 'thing',
        },
      },
      get: {
        value: () => 'https://evil.com',
      },
    });
    const res = Object.create(express.response);

    await assert.rejects(sessionService.getUserForSession(req, res), {
      message: `Request made from incorrect origin. Expected 'https://admin.example.com' received 'https://evil.com'.`,
    });
  });

  it('Throws an error when creating a session from a non-admin origin', async function () {
    const getSession = createGetSession();
    const getOriginOfRequest = sinon.stub().returns('https://evil.com');

    const sessionService = SessionService({
      getSession,
      getOriginOfRequest,
      urlUtils,
    });

    const req = Object.create(express.request, {
      ip: {
        value: '0.0.0.0',
      },
      headers: {
        value: {
          cookie: 'thing',
        },
      },
      get: {
        value: () => 'https://evil.com',
      },
    });
    const res = Object.create(express.response);
    const user = { id: 'egg' };

    // A cross-origin request (e.g. a login-CSRF form post) must not be able to
    // create or bind a session, even though it carries a valid Origin header.
    await assert.rejects(sessionService.createSessionForUser(req, res, user), {
      message: `Request made from incorrect origin. Expected 'https://admin.example.com' received 'https://evil.com'.`,
    });
    assert.equal(req.session.user_id, undefined);
    assert.equal(req.session.origin, undefined);
  });

  it("Doesn't throw an error when the csrf verification fails when bypassed", async function () {
    const getSession = async (req) => {
      if (req.session) {
        return req.session;
      }
      req.session = {
        origin: 'https://admin.example.com',
      };
      return req.session;
    };
    const findUserById = sinon.spy(async ({ id }) => ({ id }));
    const getOriginOfRequest = sinon.stub().returns('https://other.example.com');

    const sessionService = SessionService({
      getSession,
      findUserById,
      getOriginOfRequest,
      urlUtils,
    });

    const req = Object.create(express.request, {
      ip: {
        value: '0.0.0.0',
      },
      headers: {
        value: {
          cookie: 'thing',
        },
      },
      get: {
        value: () => 'https://other.example.com',
      },
    });
    const res = Object.create(express.response);
    res.locals = {
      bypassCsrfProtection: true,
    };

    await sessionService.getUserForSession(req, res);
  });

  it('Can verify a user session', async function () {
    const getSession = createGetSession();

    const findUserById = sinon.spy(async ({ id }) => ({ id }));
    const getOriginOfRequest = sinon.stub().returns('https://admin.example.com');

    const isStaffDeviceVerificationDisabled = sinon.stub().returns(false);

    const sessionService = SessionService({
      getSession,
      findUserById,
      getOriginOfRequest,
      getSettingsCache,
      isStaffDeviceVerificationDisabled,
      urlUtils,
    });

    const req = Object.create(express.request, {
      ip: {
        value: '0.0.0.0',
      },
      headers: {
        value: {
          cookie: 'thing',
        },
      },
      get: {
        value: () => 'https://admin.example.com',
      },
    });
    const res = Object.create(express.response);
    const user = { id: 'egg' };

    await sessionService.createSessionForUser(req, res, user);
    assert.equal(req.session.user_id, 'egg');
    assert.equal(req.session.verified, undefined);

    await sessionService.verifySession(req, res);
    assert.equal(req.session.verified, true);

    await sessionService.removeUserForSession(req, res);
    assert.equal(req.session.user_id, undefined);
    assert.equal(req.session.verified, true);

    await sessionService.createSessionForUser(req, res, user);
    assert.equal(req.session.user_id, 'egg');
    assert.equal(req.session.verified, true);
  });

  it('#createSessionForUser regenerates the session even when no user was assigned to it', async function () {
    const getSession = createGetSession();

    const findUserById = sinon.spy(async ({ id }) => ({ id }));
    const getOriginOfRequest = sinon.stub().returns('https://admin.example.com');

    const isStaffDeviceVerificationDisabled = sinon.stub().returns(false);

    const sessionService = SessionService({
      getSession,
      findUserById,
      getOriginOfRequest,
      getSettingsCache,
      isStaffDeviceVerificationDisabled,
      urlUtils,
    });

    const req = Object.create(express.request, {
      ip: {
        value: '0.0.0.0',
      },
      headers: {
        value: {
          cookie: 'thing',
        },
      },
      get: {
        value: () => 'https://admin.example.com',
      },
    });
    const res = Object.create(express.response);
    const user = { id: 'egg' };

    const previousSession = await getSession(req);
    await sessionService.createSessionForUser(req, res, user);

    sinon.assert.calledOnce(previousSession.regenerate);
    assert.notEqual(req.session, previousSession);
    assert.equal(req.session.user_id, 'egg');
  });

  it('#createSessionForUser does not carry verification over to a different user', async function () {
    const getSession = createGetSession();

    const findUserById = sinon.spy(async ({ id }) => ({ id }));
    const getOriginOfRequest = sinon.stub().returns('https://admin.example.com');

    const isStaffDeviceVerificationDisabled = sinon.stub().returns(false);

    const sessionService = SessionService({
      getSession,
      findUserById,
      getOriginOfRequest,
      getSettingsCache,
      isStaffDeviceVerificationDisabled,
      urlUtils,
    });

    const req = Object.create(express.request, {
      ip: {
        value: '0.0.0.0',
      },
      headers: {
        value: {
          cookie: 'thing',
        },
      },
      get: {
        value: () => 'https://admin.example.com',
      },
    });
    const res = Object.create(express.response);

    await sessionService.createSessionForUser(req, res, { id: 'egg' });
    await sessionService.verifySession(req, res);
    assert.equal(req.session.verified, true);

    // Signing in as another user without logging out first
    await sessionService.createSessionForUser(req, res, { id: 'bacon' });
    assert.equal(req.session.user_id, 'bacon');
    assert.equal(req.session.verified, undefined);
  });

  it('#createSessionForUser does not carry verification to a different user after logout', async function () {
    const getSession = createGetSession();

    const findUserById = sinon.spy(async ({ id }) => ({ id }));
    const getOriginOfRequest = sinon.stub().returns('https://admin.example.com');

    const isStaffDeviceVerificationDisabled = sinon.stub().returns(false);

    const sessionService = SessionService({
      getSession,
      findUserById,
      getOriginOfRequest,
      getSettingsCache,
      isStaffDeviceVerificationDisabled,
      urlUtils,
    });

    const req = Object.create(express.request, {
      ip: {
        value: '0.0.0.0',
      },
      headers: {
        value: {
          cookie: 'thing',
        },
      },
      get: {
        value: () => 'https://admin.example.com',
      },
    });
    const res = Object.create(express.response);

    await sessionService.createSessionForUser(req, res, { id: 'egg' });
    await sessionService.verifySession(req, res);
    assert.equal(await sessionService.isVerifiedSession(req, res), true);

    // Trusted-device mode: logout keeps the verified flag
    await sessionService.removeUserForSession(req, res);
    assert.equal(req.session.user_id, undefined);
    assert.equal(req.session.verified, true);

    // A different user signing in must verify again
    await sessionService.createSessionForUser(req, res, { id: 'bacon' });
    assert.equal(req.session.user_id, 'bacon');
    assert.equal(req.session.verified, undefined);
    assert.equal(await sessionService.isVerifiedSession(req, res), false);
  });

  it('#createSessionForUser keeps trusted-device verification for the same user after logout', async function () {
    const getSession = createGetSession();

    const findUserById = sinon.spy(async ({ id }) => ({ id }));
    const getOriginOfRequest = sinon.stub().returns('https://admin.example.com');

    const isStaffDeviceVerificationDisabled = sinon.stub().returns(false);

    const sessionService = SessionService({
      getSession,
      findUserById,
      getOriginOfRequest,
      getSettingsCache,
      isStaffDeviceVerificationDisabled,
      urlUtils,
    });

    const req = Object.create(express.request, {
      ip: {
        value: '0.0.0.0',
      },
      headers: {
        value: {
          cookie: 'thing',
        },
      },
      get: {
        value: () => 'https://admin.example.com',
      },
    });
    const res = Object.create(express.response);

    await sessionService.createSessionForUser(req, res, { id: 'egg' });
    await sessionService.verifySession(req, res);

    await sessionService.removeUserForSession(req, res);

    await sessionService.createSessionForUser(req, res, { id: 'egg' });
    assert.equal(req.session.user_id, 'egg');
    assert.equal(req.session.verified, true);
    assert.equal(await sessionService.isVerifiedSession(req, res), true);
  });

  it('Treats legacy verified sessions without verified_user_id as unverified', async function () {
    const getSession = createGetSession({
      user_id: 'egg',
      verified: true,
      origin: 'https://admin.example.com',
    });

    const findUserById = sinon.spy(async ({ id }) => ({ id }));
    const getOriginOfRequest = sinon.stub().returns('https://admin.example.com');

    const isStaffDeviceVerificationDisabled = sinon.stub().returns(false);

    const sessionService = SessionService({
      getSession,
      findUserById,
      getOriginOfRequest,
      getSettingsCache,
      isStaffDeviceVerificationDisabled,
      urlUtils,
    });

    const req = Object.create(express.request, {
      ip: {
        value: '0.0.0.0',
      },
      headers: {
        value: {
          cookie: 'thing',
        },
      },
      get: {
        value: () => 'https://admin.example.com',
      },
    });
    const res = Object.create(express.response);

    assert.equal(await sessionService.isVerifiedSession(req, res), false);

    // Verification is not carried into a new login either
    await sessionService.createSessionForUser(req, res, { id: 'egg' });
    assert.equal(req.session.verified, undefined);
    assert.equal(await sessionService.isVerifiedSession(req, res), false);
  });

  it('#createSessionForUser verifies session when valid token is provided on request', async function () {
    const getSession = createGetSession();

    const findUserById = sinon.spy(async ({ id }) => ({ id }));
    const getOriginOfRequest = sinon.stub().returns('https://admin.example.com');

    const isStaffDeviceVerificationDisabled = sinon.stub().returns(false);

    const sessionService = SessionService({
      getSession,
      findUserById,
      getOriginOfRequest,
      getSettingsCache,
      isStaffDeviceVerificationDisabled,
      urlUtils,
    });

    const req = Object.create(express.request, {
      ip: {
        value: '0.0.0.0',
      },
      headers: {
        value: {
          cookie: 'thing',
        },
      },
      get: {
        value: () => 'https://admin.example.com',
      },
    });
    const res = Object.create(express.response);
    const user = { id: 'egg' };

    // Generate a valid token for the same session challenge
    const previousSession = await getSession(req);
    previousSession.user_id = 'egg';
    const validToken = await sessionService.generateAuthCodeForUser(req, res);

    // Now create session with token on request body
    req.body = { token: validToken };
    await sessionService.createSessionForUser(req, res, user);

    assert.equal(req.session.user_id, 'egg');
    assert.equal(req.session.verified, true);
  });

  it('#createSessionForUser resets the verification-email rate limit when a valid token is provided on request', async function () {
    // The one-shot login path (POST /session with a token) verifies via
    // assignUserToSession without calling verifySession, so it must reset the
    // limiter on its own branch.
    const getSession = createGetSession();

    const findUserById = sinon.spy(async ({ id }) => ({ id }));
    const getOriginOfRequest = sinon.stub().returns('https://admin.example.com');
    const isStaffDeviceVerificationDisabled = sinon.stub().returns(false);
    const resetVerificationEmailForUser = sinon.stub().resolves();

    const sessionService = SessionService({
      getSession,
      findUserById,
      getOriginOfRequest,
      getSettingsCache,
      isStaffDeviceVerificationDisabled,
      urlUtils,
      resetVerificationEmailForUser,
    });

    const req = Object.create(express.request, {
      ip: {
        value: '0.0.0.0',
      },
      headers: {
        value: {
          cookie: 'thing',
        },
      },
      get: {
        value: () => 'https://admin.example.com',
      },
    });
    const res = Object.create(express.response);
    const user = { id: 'egg' };

    // Generate a valid token for the same session challenge
    const previousSession = await getSession(req);
    previousSession.user_id = 'egg';
    const validToken = await sessionService.generateAuthCodeForUser(req, res);

    req.body = { token: validToken };
    await sessionService.createSessionForUser(req, res, user);

    assert.equal(req.session.verified, true);
    sinon.assert.calledOnceWithExactly(resetVerificationEmailForUser, 'egg');
  });

  it('#createSessionForUser does not verify session when invalid token is provided on request', async function () {
    const getSession = createGetSession();

    const findUserById = sinon.spy(async ({ id }) => ({ id }));
    const getOriginOfRequest = sinon.stub().returns('https://admin.example.com');

    const isStaffDeviceVerificationDisabled = sinon.stub().returns(false);

    const sessionService = SessionService({
      getSession,
      findUserById,
      getOriginOfRequest,
      getSettingsCache,
      isStaffDeviceVerificationDisabled,
      urlUtils,
    });

    const req = Object.create(express.request, {
      ip: {
        value: '0.0.0.0',
      },
      headers: {
        value: {
          cookie: 'thing',
        },
      },
      get: {
        value: () => 'https://admin.example.com',
      },
    });
    const res = Object.create(express.response);
    const user = { id: 'egg' };

    // Provide an invalid token on request body
    req.body = { token: '000000' };
    await sessionService.createSessionForUser(req, res, user);

    assert.equal(req.session.user_id, 'egg');
    assert.equal(req.session.verified, undefined);
  });

  it('#createSessionForUser does not verify session when token belongs to a different session challenge', async function () {
    const getSession = createGetSession();

    const findUserById = sinon.spy(async ({ id }) => ({ id }));
    const getOriginOfRequest = sinon.stub().returns('https://admin.example.com');

    const isStaffDeviceVerificationDisabled = sinon.stub().returns(false);

    const sessionService = SessionService({
      getSession,
      findUserById,
      getOriginOfRequest,
      getSettingsCache,
      isStaffDeviceVerificationDisabled,
      urlUtils,
    });

    const req = Object.create(express.request, {
      ip: {
        value: '0.0.0.0',
      },
      headers: {
        value: {
          cookie: 'thing',
        },
      },
      get: {
        value: () => 'https://admin.example.com',
      },
    });
    const res = Object.create(express.response);
    const user = { id: 'egg' };

    // Generate token from a different challenge/session context
    const tokenReq = Object.create(express.request, {
      ip: {
        value: '0.0.0.0',
      },
      headers: {
        value: {
          cookie: 'thing',
        },
      },
      get: {
        value: () => 'https://admin.example.com',
      },
    });
    tokenReq.session = { user_id: 'egg' };
    const validTokenForOtherSession = await sessionService.generateAuthCodeForUser(tokenReq, res);

    req.body = { token: validTokenForOtherSession };
    await sessionService.createSessionForUser(req, res, user);

    assert.equal(req.session.user_id, 'egg');
    assert.equal(req.session.verified, undefined);
  });

  it('Generates a valid auth code and verifies it correctly', async function () {
    const getSession = async (req) => {
      if (req.session) {
        return req.session;
      }
      req.session = {
        destroy: sinon.spy((cb) => cb()),
        user_id: 'user-123',
        origin: 'https://admin.example.com',
      };
      return req.session;
    };
    const findUserById = sinon.spy(async ({ id }) => ({ id }));
    const getOriginOfRequest = sinon.stub().returns('https://admin.example.com');

    const sessionService = SessionService({
      getSession,
      findUserById,
      getOriginOfRequest,
      getSettingsCache,
      urlUtils,
    });

    const req = Object.create(express.request, {
      ip: {
        value: '0.0.0.0',
      },
      headers: {
        value: {
          cookie: 'thing',
        },
      },
      get: {
        value: () => 'Fake',
      },
    });
    const res = Object.create(express.response);

    // Generate the auth code
    const authCode = await sessionService.generateAuthCodeForUser(req, res);
    assertExists(authCode);

    req.body = {
      token: authCode,
    };

    // Verify the auth code
    const isValid = await sessionService.verifyAuthCodeForUser(req, res);
    assert.equal(isValid, true);

    // A code can only be used once
    const isValidOnSecondUse = await sessionService.verifyAuthCodeForUser(req, res);
    assert.equal(isValidOnSecondUse, false);
  });

  it('Fails to verify an incorrect auth code', async function () {
    const getSession = async (req) => {
      if (req.session) {
        return req.session;
      }
      req.session = {
        destroy: sinon.spy((cb) => cb()),
        user_id: 'user-123',
        origin: 'https://admin.example.com',
      };
      return req.session;
    };
    const findUserById = sinon.spy(async ({ id }) => ({ id }));
    const getOriginOfRequest = sinon.stub().returns('https://admin.example.com');

    const sessionService = SessionService({
      getSession,
      findUserById,
      getOriginOfRequest,
      getSettingsCache,
      urlUtils,
    });

    const req = Object.create(express.request, {
      ip: {
        value: '0.0.0.0',
      },
      headers: {
        value: {
          cookie: 'thing',
        },
      },
      get: {
        value: () => 'Fake',
      },
    });
    const res = Object.create(express.response);

    // Generate the auth code
    const authCode = await sessionService.generateAuthCodeForUser(req, res);
    assertExists(authCode);

    req.body = {
      token: 'wrong-code',
    };

    // Verify an incorrect auth code
    const isValid = await sessionService.verifyAuthCodeForUser(req, res);
    assert.equal(isValid, false);
  });

  describe('challenge attempt budget', function () {
    function setup() {
      const limiter = new BackoffLimiter(
        'staff-challenge-test',
        (options) => new RateLimiterMemory(options),
        {
          ...defaults.spam.user_verification_challenge,
          ignoreIP: true,
          onBlocked: () => new Error('Challenge exhausted'),
        },
      );
      const consumeAuthCodeAttempt = sinon.spy(async (challenge) => {
        if (!(await limiter.consume({ key: challenge })).allowed) {
          throw new Error('Challenge exhausted');
        }
      });
      const sessionService = SessionService({
        getSession: createGetSession({ user_id: 'egg', origin: 'https://admin.example.com' }),
        getOriginOfRequest: () => 'https://admin.example.com',
        getSettingsCache,
        urlUtils,
        isStaffDeviceVerificationDisabled: () => false,
        consumeAuthCodeAttempt,
      });
      const req = { get: () => 'https://admin.example.com', body: {} };
      return { sessionService, req, consumeAuthCodeAttempt };
    }

    it('shares the budget across verification and regenerated sign-in sessions', async function () {
      const { sessionService, req } = setup();
      const code = await sessionService.generateAuthCodeForUser(req, {});
      req.body = { token: 'wrong-code' };
      for (let i = 0; i < 4; i++) {
        assert.equal(await sessionService.verifyAuthCodeForUser(req, {}), false);
      }
      await sessionService.createSessionForUser(req, {}, { id: 'egg' });
      req.body = { token: code };
      await assert.rejects(sessionService.verifyAuthCodeForUser(req, {}), /Challenge exhausted/);
      await assert.rejects(
        sessionService.createSessionForUser(req, {}, { id: 'egg' }),
        /Challenge exhausted/,
      );
      assert.notEqual(req.session.verified, true);
    });

    it('allows the correct code on the fifth attempt', async function () {
      const { sessionService, req } = setup();
      const code = await sessionService.generateAuthCodeForUser(req, {});
      req.body = { token: 'wrong-code' };
      for (let i = 0; i < 4; i++) {
        await sessionService.verifyAuthCodeForUser(req, {});
      }
      req.body = { token: code };
      await sessionService.createSessionForUser(req, {}, { id: 'egg' });
      assert.equal(req.session.verified, true);
    });

    it('limits concurrent session snapshots across IPs and gives a fresh challenge its own budget', async function () {
      const { sessionService, req } = setup();
      const code = await sessionService.generateAuthCodeForUser(req, {});
      const outcomes = await Promise.allSettled(
        Array.from({ length: 20 }, (_, i) =>
          sessionService.verifyAuthCodeForUser(
            {
              session: { ...req.session },
              ip: `192.0.2.${i}`,
              body: { token: 'wrong-code' },
            },
            {},
          ),
        ),
      );
      assert.equal(
        outcomes.filter((result) => result.status === 'fulfilled' && result.value === false).length,
        5,
      );
      assert.equal(
        outcomes.filter(
          (result) =>
            result.status === 'rejected' && result.reason.message === 'Challenge exhausted',
        ).length,
        15,
      );
      req.body = { token: code };
      await assert.rejects(sessionService.verifyAuthCodeForUser(req, {}), /Challenge exhausted/);

      const freshReq = {};
      const freshCode = await sessionService.generateAuthCodeForUser(freshReq, {});
      freshReq.body = { token: freshCode };
      assert.equal(await sessionService.verifyAuthCodeForUser(freshReq, {}), true);
    });

    it('does not consume attempts for missing tokens or expired challenges, and fails closed on store errors', async function () {
      const { sessionService, req, consumeAuthCodeAttempt } = setup();
      await sessionService.generateAuthCodeForUser(req, {});
      assert.equal(await sessionService.verifyAuthCodeForUser(req, {}), false);
      req.body = { token: '123456' };
      req.session.auth_code_generated_at = Date.now() - 300001;
      assert.equal(await sessionService.verifyAuthCodeForUser(req, {}), false);
      sinon.assert.notCalled(consumeAuthCodeAttempt);

      const broken = SessionService({
        getSession: async () => ({
          user_id: 'egg',
          auth_code_challenge: 'challenge',
          auth_code_generated_at: Date.now(),
        }),
        getOriginOfRequest: () => 'https://admin.example.com',
        getSettingsCache,
        urlUtils,
        consumeAuthCodeAttempt: async () => {
          throw new Error('Store unavailable');
        },
      });
      await assert.rejects(broken.verifyAuthCodeForUser(req, {}), /Store unavailable/);
    });
  });

  it('Generates a different auth code for a different secret', async function () {
    const getSession = async (req) => {
      if (req.session) {
        return req.session;
      }
      req.session = {
        destroy: sinon.spy((cb) => cb()),
        user_id: 'user-123',
      };
      return req.session;
    };
    const findUserById = sinon.spy(async ({ id }) => ({ id }));
    const getOriginOfRequest = sinon.stub().returns('https://admin.example.com');

    const req = Object.create(express.request, {
      ip: {
        value: '0.0.0.0',
      },
      headers: {
        value: {
          cookie: 'thing',
        },
      },
      get: {
        value: () => 'https://admin.example.com',
      },
    });
    const res = Object.create(express.response);

    // Test for first secret
    const getSecretFirst = sinon.stub().returns('secret-key');
    const sessionServiceFirst = SessionService({
      getSession,
      findUserById,
      getOriginOfRequest,
      getSettingsCache: getSecretFirst,
      urlUtils,
    });

    const authCodeFirst = await sessionServiceFirst.generateAuthCodeForUser(req, res);

    // Test for second secret
    const getSecretSecond = sinon.stub().returns('different-secret-key');
    const sessionServiceSecond = SessionService({
      getSession,
      findUserById,
      getOriginOfRequest,
      getSettingsCache: getSecretSecond,
      urlUtils,
    });

    const authCodeSecond = await sessionServiceSecond.generateAuthCodeForUser(req, res);
    assert.notEqual(authCodeFirst, authCodeSecond);
  });

  it('sends an email with the auth code', async function () {
    const getSession = async (req) => {
      if (req.session) {
        return req.session;
      }
      req.session = {
        user_id: 'user-123',
        ip: '0.0.0.0',
        user_agent: 'Fake',
        origin: 'https://admin.example.com',
      };
      return req.session;
    };

    const findUserById = sinon.stub().resolves({
      id: 'user-123',
      get: sinon.stub().returns('test@example.com'),
    });

    const mailer = {
      send: sinon.stub().resolves(),
    };

    const getBlogLogo = sinon.stub().returns('logo.png');
    const localUrlUtils = {
      getAdminUrl: sinon.stub().returns('https://admin.example.com'),
      getSiteUrl: sinon.stub().returns('https://example.com'),
      urlFor: sinon.stub().returns('https://example.com'),
    };

    const t = sinon.stub().callsFake((text) => text);
    const getOriginOfRequest = sinon.stub().returns('https://admin.example.com');

    const sessionService = SessionService({
      getSession,
      findUserById,
      getOriginOfRequest,
      getSettingsCache,
      getBlogLogo,
      urlUtils: localUrlUtils,
      mailer,
      t,
    });

    const req = Object.create(express.request, {
      headers: {
        value: {
          origin: 'https://admin.example.com',
        },
      },
    });
    const res = Object.create(express.response);

    await sessionService.sendAuthCodeToUser(req, res);

    sinon.assert.calledOnce(mailer.send);
    const emailArgs = mailer.send.firstCall.args[0];
    assert.equal(emailArgs.to, 'test@example.com');
    assert.match(emailArgs.subject, /Ghost sign in verification code/);
  });

  it('rate-limits the verification email per user and does not send when the limit is exceeded', async function () {
    const getSession = async (req) => {
      if (req.session) {
        return req.session;
      }
      req.session = {
        user_id: 'user-123',
        origin: 'https://admin.example.com',
      };
      return req.session;
    };

    const mailer = {
      send: sinon.stub().resolves(),
    };

    const getOriginOfRequest = sinon.stub().returns('https://admin.example.com');
    const limitVerificationEmailForUser = sinon
      .stub()
      .rejects(new errors.TooManyRequestsError({ message: 'Too many attempts.' }));

    const sessionService = SessionService({
      getSession,
      getOriginOfRequest,
      urlUtils,
      mailer,
      limitVerificationEmailForUser,
    });

    const req = Object.create(express.request, {
      headers: {
        value: {
          origin: 'https://admin.example.com',
        },
      },
    });
    const res = Object.create(express.response);

    await assert.rejects(sessionService.sendAuthCodeToUser(req, res), {
      errorType: 'TooManyRequestsError',
    });

    sinon.assert.calledOnceWithExactly(limitVerificationEmailForUser, 'user-123');
    assert.equal(mailer.send.callCount, 0, 'No email should be sent when rate limited');
  });

  it('resets the verification-email rate limit for the user on successful verification', async function () {
    const getSession = createGetSession({ user_id: 'user-777' });
    const resetVerificationEmailForUser = sinon.stub().resolves();

    const sessionService = SessionService({
      getSession,
      resetVerificationEmailForUser,
    });

    const req = Object.create(express.request);
    const res = Object.create(express.response);

    await sessionService.verifySession(req, res);

    assert.equal(req.session.verified, true);
    sinon.assert.calledOnceWithExactly(resetVerificationEmailForUser, 'user-777');
  });

  it('completes verification when resetting the email budget fails', async function () {
    const resetVerificationEmailForUser = sinon.stub().rejects(new Error('Store unavailable'));
    const sessionService = SessionService({
      getSession: createGetSession({ user_id: 'user-777' }),
      resetVerificationEmailForUser,
    });
    const req = Object.create(express.request);

    await sessionService.verifySession(req, Object.create(express.response));

    assert.equal(req.session.verified, true);
    sinon.assert.calledOnceWithExactly(resetVerificationEmailForUser, 'user-777');
  });

  it('throws an error when mail fails to send', async function () {
    const getSession = async (req) => {
      if (req.session) {
        return req.session;
      }
      req.session = {
        user_id: 'user-123',
        ip: '0.0.0.0',
        user_agent: 'Fake',
        origin: 'https://admin.example.com',
      };
      return req.session;
    };

    const findUserById = sinon.stub().resolves({
      id: 'user-123',
      get: sinon.stub().returns('test@example.com'),
    });

    const mailer = {
      send: sinon.stub().rejects(new Error('Mail error')),
    };

    const getBlogLogo = sinon.stub().returns('logo.png');
    const localUrlUtils = {
      getAdminUrl: sinon.stub().returns('https://admin.example.com'),
      getSiteUrl: sinon.stub().returns('https://example.com'),
      urlFor: sinon.stub().returns('https://example.com'),
    };

    const t = sinon.stub().callsFake((text) => text);
    const getOriginOfRequest = sinon.stub().returns('https://admin.example.com');

    const sessionService = SessionService({
      getSession,
      findUserById,
      getOriginOfRequest,
      getSettingsCache,
      getBlogLogo,
      urlUtils: localUrlUtils,
      mailer,
      t,
    });

    const req = Object.create(express.request, {
      headers: {
        value: {
          origin: 'https://admin.example.com',
        },
      },
    });
    const res = Object.create(express.response);

    await assert.rejects(sessionService.sendAuthCodeToUser(req, res), {
      message: 'Failed to send email. Please check your site configuration and try again.',
    });
  });

  it('Can create a verified session for SSO', async function () {
    const getSession = createGetSession();
    const findUserById = sinon.spy(async ({ id }) => ({ id }));
    const getOriginOfRequest = sinon.stub().returns('https://admin.example.com');

    const isStaffDeviceVerificationDisabled = sinon.stub().returns(false);

    const sessionService = SessionService({
      getSession,
      findUserById,
      getOriginOfRequest,
      isStaffDeviceVerificationDisabled,
      urlUtils,
    });

    const req = Object.create(express.request, {
      ip: {
        value: '0.0.0.0',
      },
      headers: {
        value: {
          cookie: 'thing',
        },
      },
      get: {
        value: () => 'https://admin.example.com',
      },
    });
    const res = Object.create(express.response);
    const user = { id: 'egg' };

    await sessionService.createVerifiedSessionForUser(req, res, user);

    assert.equal(req.session.user_id, 'egg');
    assert.equal(req.session.verified, true);
    // Verification must be bound to the SSO user, or isVerifiedSession
    // would reject it and lock the user into a re-verify loop
    assert.equal(req.session.verified_user_id, 'egg');
    assert.equal(await sessionService.isVerifiedSession(req, res), true);
  });

  it('Throws if the user id is invalid', async function () {
    const getSession = async (req) => {
      if (req.session) {
        return req.session;
      }
      req.session = {
        user_id: 'user-123',
        ip: '0.0.0.0',
        user_agent: 'Fake',
        origin: 'https://admin.example.com',
      };
      return req.session;
    };

    const findUserById = sinon.stub().rejects(new Error('User not found'));

    const mailer = {
      send: sinon.stub().resolves(),
    };

    const getBlogLogo = sinon.stub().returns('logo.png');
    const localUrlUtils = {
      getAdminUrl: sinon.stub().returns('https://admin.example.com'),
      getSiteUrl: sinon.stub().returns('https://example.com'),
      urlFor: sinon.stub().returns('https://example.com'),
    };

    const t = sinon.stub().callsFake((text) => text);
    const getOriginOfRequest = sinon.stub().returns('https://admin.example.com');

    const sessionService = SessionService({
      getSession,
      findUserById,
      getOriginOfRequest,
      getSettingsCache,
      getBlogLogo,
      urlUtils: localUrlUtils,
      mailer,
      t,
    });

    const req = Object.create(express.request, {
      headers: {
        value: {
          origin: 'https://admin.example.com',
        },
      },
    });
    const res = Object.create(express.response);

    await assert.rejects(sessionService.sendAuthCodeToUser(req, res), {
      message: 'Could not fetch user from the session.',
    });
  });

  it('Can remove verified session', async function () {
    const getSession = createGetSession();

    const findUserById = sinon.spy(async ({ id }) => ({ id }));
    const getOriginOfRequest = sinon.stub().returns('https://admin.example.com');

    const isStaffDeviceVerificationDisabled = sinon.stub().returns(false);
    getSettingsCache.withArgs('require_email_mfa').returns(true);

    const sessionService = SessionService({
      getSession,
      findUserById,
      getOriginOfRequest,
      getSettingsCache,
      isStaffDeviceVerificationDisabled,
      urlUtils,
    });

    const req = Object.create(express.request, {
      ip: {
        value: '0.0.0.0',
      },
      headers: {
        value: {
          cookie: 'thing',
        },
      },
      get: {
        value: () => 'https://admin.example.com',
      },
    });
    const res = Object.create(express.response);
    const user = { id: 'egg' };

    await sessionService.createSessionForUser(req, res, user);
    assert.equal(req.session.user_id, 'egg');
    assert.equal(req.session.verified, undefined);

    await sessionService.verifySession(req, res);
    assert.equal(req.session.verified, true);

    await sessionService.removeUserForSession(req, res);
    assert.equal(req.session.user_id, undefined);
    assert.equal(req.session.verified, undefined);

    await sessionService.createSessionForUser(req, res, user);
    assert.equal(req.session.user_id, 'egg');
    assert.equal(req.session.verified, undefined);
  });

  it('Rejects sendAuthCodeToUser when origin does not match admin URL', async function () {
    const getSession = async (req) => {
      if (req.session) {
        return req.session;
      }
      req.session = {
        user_id: 'user-123',
        ip: '0.0.0.0',
        user_agent: 'Fake',
        origin: 'https://evil.com',
      };
      return req.session;
    };

    const findUserById = sinon.stub().resolves({
      id: 'user-123',
      get: sinon.stub().returns('test@example.com'),
    });

    const mailer = {
      send: sinon.stub().resolves(),
    };

    const getBlogLogo = sinon.stub().returns('logo.png');
    const getOriginOfRequest = sinon.stub().returns('https://evil.com');

    const sessionService = SessionService({
      getSession,
      findUserById,
      getOriginOfRequest,
      getSettingsCache,
      getBlogLogo,
      urlUtils,
      mailer,
      t: sinon.stub().callsFake((text) => text),
    });

    const req = Object.create(express.request, {
      headers: {
        value: {
          origin: 'https://evil.com',
        },
      },
    });
    const res = Object.create(express.response);

    await assert.rejects(sessionService.sendAuthCodeToUser(req, res), {
      message: `Request made from incorrect origin. Expected 'https://admin.example.com' received 'https://evil.com'.`,
    });

    assert.equal(mailer.send.callCount, 0, 'No email should be sent');
  });

  it('Falls back to site URL when no admin URL is configured', async function () {
    const getSession = async (req) => {
      if (req.session) {
        return req.session;
      }
      req.session = {
        user_id: 'user-123',
        origin: 'https://example.com',
      };
      return req.session;
    };

    const findUserById = sinon.spy(async ({ id }) => ({ id }));
    const getOriginOfRequest = sinon.stub().returns('https://example.com');
    const siteOnlyUrlUtils = {
      getAdminUrl: sinon.stub().returns(null),
      getSiteUrl: sinon.stub().returns('https://example.com'),
      urlFor: sinon.stub().returns('https://example.com'),
    };

    const sessionService = SessionService({
      getSession,
      findUserById,
      getOriginOfRequest,
      getSettingsCache,
      urlUtils: siteOnlyUrlUtils,
    });

    const req = Object.create(express.request, {
      ip: {
        value: '0.0.0.0',
      },
      headers: {
        value: {
          cookie: 'thing',
        },
      },
      get: {
        value: () => 'https://example.com',
      },
    });
    const res = Object.create(express.response);

    const user = await sessionService.getUserForSession(req, res);
    assert.deepEqual(user, { id: 'user-123' });
  });

  describe('isVerificationRequired', function () {
    it('returns true when require_email_mfa is true', async function () {
      getSettingsCache.withArgs('require_email_mfa').returns(true);

      const sessionService = SessionService({
        getSettingsCache,
      });

      const result = sessionService.isVerificationRequired();
      assert.equal(result, true);
    });

    it('returns false when require_email_mfa is false', async function () {
      getSettingsCache.withArgs('require_email_mfa').returns(false);

      const sessionService = SessionService({
        getSettingsCache,
      });

      const result = sessionService.isVerificationRequired();
      assert.equal(result, false);
    });

    it('returns false when require_email_mfa is not set', async function () {
      getSettingsCache.withArgs('require_email_mfa').returns(undefined);

      const sessionService = SessionService({
        getSettingsCache,
      });

      const result = sessionService.isVerificationRequired();
      assert.equal(result, false);
    });
  });
});
