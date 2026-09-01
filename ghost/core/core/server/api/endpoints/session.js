const tpl = require('@tryghost/tpl');
const errors = require('@tryghost/errors');
const models = require('../../models');
const auth = require('../../services/auth');
const api = require('./index');
const passkeys = require('../../services/passkeys');
const {
  authenticationRequestSchema,
  passkeyIdParamsSchema,
  registrationRequestSchema,
} = require('../../services/passkeys/schema');
const urlUtils = require('../../../shared/url-utils').default;

const messages = {
  accessDenied: 'Access Denied.',
};

/** @type {import('@tryghost/api-framework').Controller} */
const controller = {
  add(frame) {
    const object = frame.data;

    if (!object || !object.username || !object.password) {
      return Promise.reject(
        new errors.UnauthorizedError({
          message: tpl(messages.accessDenied),
        }),
      );
    }

    let skipVerification = false;

    return models.User.getByEmail(object.username)
      .then((user) => {
        if (user && !user.hasLoggedIn()) {
          skipVerification = true;
        }

        return models.User.check({
          email: object.username,
          password: object.password,
        });
      })
      .then((user) => {
        return Promise.resolve(function sessionMiddleware(req, res, next) {
          req.brute.reset(function (err) {
            if (err) {
              return next(err);
            }
            req.user = user;
            req.skipVerification = skipVerification;

            auth.session.createSession(req, res, next);
          });
        });
      })
      .catch(async (err) => {
        if (!errors.utils.isGhostError(err)) {
          throw new errors.UnauthorizedError({
            message: tpl(messages.accessDenied),
            err,
          });
        }

        if (err.errorType === 'PasswordResetRequiredError') {
          await api.authentication.generateResetToken(
            {
              password_reset: [
                {
                  email: object.username,
                },
              ],
            },
            frame.options.context,
          );
        }

        throw err;
      });
  },
  delete() {
    return Promise.resolve(function logoutSessionMw(req, res, next) {
      auth.session.logout(req, res, next);
    });
  },
  sendVerification() {
    return Promise.resolve(function sendAuthCodeMw(req, res, next) {
      auth.session.sendAuthCode(req, res, next);
    });
  },
  verify() {
    return Promise.resolve(function verifyAuthCodeMw(req, res, next) {
      auth.session.verifyAuthCode(req, res, next);
    });
  },
  passkeys() {
    return Promise.resolve(async function listPasskeysMw(req, res, next) {
      try {
        const origin = new URL(urlUtils.getAdminUrl() || urlUtils.getSiteUrl()).origin;
        const credentials = await passkeys.list({
          userId: req.user.id,
          rpID: new URL(origin).hostname,
        });
        res.json({ passkeys: credentials });
      } catch (error) {
        next(error);
      }
    });
  },
  beginPasskeyRegistration() {
    return Promise.resolve(async function beginPasskeyRegistrationMw(req, res, next) {
      try {
        const origin = new URL(urlUtils.getAdminUrl() || urlUtils.getSiteUrl()).origin;
        const { options } = await passkeys.registrationOptions({
          userId: req.user.id,
          email: req.user.get('email'),
          name: req.user.get('name'),
          origin,
        });
        req.session.passkey_registration_ceremony = passkeys.createCeremonyToken({
          challenge: options.challenge,
          purpose: 'staff-registration',
          subjectId: req.user.id,
        });
        res.json(options);
      } catch (error) {
        next(error);
      }
    });
  },
  finishPasskeyRegistration() {
    return Promise.resolve(async function finishPasskeyRegistrationMw(req, res, next) {
      try {
        const request = registrationRequestSchema.safeParse(req.body);
        if (!request.success) {
          throw new errors.BadRequestError({
            message: 'Invalid passkey registration request.',
          });
        }
        const ceremonyToken = req.session.passkey_registration_ceremony;
        req.session.passkey_registration_ceremony = undefined;
        const ceremony = ceremonyToken
          ? passkeys.verifyCeremonyToken(ceremonyToken, {
              purpose: 'staff-registration',
              subjectId: req.user.id,
            })
          : null;
        if (!ceremony) {
          throw new errors.BadRequestError({
            message: 'Passkey registration challenge expired.',
          });
        }
        const origin = new URL(urlUtils.getAdminUrl() || urlUtils.getSiteUrl()).origin;
        const credential = await passkeys.register({
          userId: req.user.id,
          origin,
          expectedChallenge: ceremony.challenge,
          response: request.data.response,
          name: request.data.name,
          ceremonyId: ceremony.id,
          ceremonyExpires: ceremony.expires,
        });
        if (!credential) {
          throw new errors.BadRequestError({
            message: 'Passkey registration failed.',
          });
        }
        res.status(201).json({ passkeys: [credential] });
      } catch (error) {
        next(error);
      }
    });
  },
  removePasskey() {
    return Promise.resolve(async function removePasskeyMw(req, res, next) {
      try {
        const params = passkeyIdParamsSchema.safeParse(req.params);
        if (!params.success) {
          throw new errors.NotFoundError({ message: 'Passkey not found.' });
        }
        const origin = new URL(urlUtils.getAdminUrl() || urlUtils.getSiteUrl()).origin;
        const removed = await passkeys.remove({
          id: params.data.id,
          userId: req.user.id,
          rpID: new URL(origin).hostname,
        });
        if (!removed) {
          throw new errors.NotFoundError({ message: 'Passkey not found.' });
        }
        res.sendStatus(204);
      } catch (error) {
        next(error);
      }
    });
  },
  beginPasskeyAuthentication() {
    return Promise.resolve(async function beginPasskeyAuthenticationMw(req, res, next) {
      try {
        const user = await auth.session.sessionService.getUserForSession(req, res);
        const origin = new URL(urlUtils.getAdminUrl() || urlUtils.getSiteUrl()).origin;
        const { options } = await passkeys.authenticationOptions({
          userId: user?.id,
          origin,
        });
        const ceremony = passkeys.createCeremonyToken({
          challenge: options.challenge,
          purpose: 'staff-authentication',
          subjectId: user?.id,
        });
        res.json({ ...options, ceremony });
      } catch (error) {
        next(error);
      }
    });
  },
  finishPasskeyAuthentication() {
    return Promise.resolve(async function finishPasskeyAuthenticationMw(req, res, next) {
      try {
        const request = authenticationRequestSchema.safeParse(req.body);
        if (!request.success || !request.data.ceremony) {
          throw new errors.UnauthorizedError({
            message: 'Passkey authentication failed.',
          });
        }
        const user = await auth.session.sessionService.getUserForSession(req, res);
        const ceremony = passkeys.verifyCeremonyToken(request.data.ceremony, {
          purpose: 'staff-authentication',
          subjectId: user?.id,
        });
        if (!ceremony) {
          throw new errors.UnauthorizedError({
            message: 'Passkey authentication challenge expired.',
          });
        }
        const origin = new URL(urlUtils.getAdminUrl() || urlUtils.getSiteUrl()).origin;
        const result = await passkeys.authenticate({
          origin,
          expectedChallenge: ceremony.challenge,
          response: request.data.response,
          audience: 'staff',
          ceremonyId: ceremony.id,
          ceremonyExpires: ceremony.expires,
        });
        if (
          !result ||
          (user && result.userId !== user.id) ||
          (ceremony.subjectId && result.userId !== ceremony.subjectId)
        ) {
          throw new errors.UnauthorizedError({
            message: 'Passkey authentication failed.',
          });
        }

        if (user) {
          await auth.session.sessionService.verifySession(req, res);
          res.sendStatus(200);
          return;
        }

        const passkeyUser = await models.User.findOne({
          id: result.userId,
          status: 'all',
        });
        if (!passkeyUser || !passkeyUser.isActive()) {
          throw new errors.UnauthorizedError({
            message: 'Passkey authentication failed.',
          });
        }
        await auth.session.sessionService.createVerifiedSessionForUser(req, res, passkeyUser);
        res.sendStatus(201);
      } catch (error) {
        next(error);
      }
    });
  },
};

module.exports = controller;
