import type { Frame } from '@tryghost/api-framework';
import type { NextFunction, Request, Response } from 'express';
import * as errors from '@tryghost/errors';
import tpl from '@tryghost/tpl';
import type { SpamPrevention } from '../../web/shared/middleware/api/spam-prevention';
import config from '../../../shared/config';
import urlUtils from '../../../shared/url-utils';

const models = require('../../models');
const auth = require('../../auth');
const api = require('./index');
const spamPrevention: SpamPrevention = require('../../web/shared/middleware/api/spam-prevention');

// Chosen once at load, as in auth/authenticate.ts
const isBetterAuth = config.get('auth:engine') === 'better-auth';

type BetterAuthSession = ReturnType<
  typeof import('../../auth/better-auth/session-controller').createSessionController
>;

// Better Auth loads only under its engine
let betterAuthSession: BetterAuthSession | undefined;
function getBetterAuthSession(): BetterAuthSession {
  if (!betterAuthSession) {
    const { createSessionController } = require('../../auth/better-auth/session-controller');

    betterAuthSession = createSessionController({
      getAuth: () => auth.betterAuth.service.api,
      getOriginOfRequest: auth.session.getOriginOfRequest,
      getAdminOrigin: () => urlUtils.getAdminOrigin(),
      resetUserLogin: (req: Request) => spamPrevention.userLogin().resetRequest(req),
      findUserByEmail: (email: string) => models.User.getByEmail(email),
    }) as BetterAuthSession;
  }
  return betterAuthSession;
}

const messages = {
  accessDenied: 'Access Denied.',
};

type SessionFrame = Frame<{ data: { username?: string; password?: string } }>;

type SessionRequest = Request & { user?: unknown; skipVerification?: boolean };

type SessionMiddleware = (req: SessionRequest, res: Response, next: NextFunction) => unknown;

const controller = {
  add(frame: SessionFrame): Promise<SessionMiddleware> {
    const object = frame.data;

    if (!object || !object.username || !object.password) {
      return Promise.reject(
        new errors.UnauthorizedError({
          message: tpl(messages.accessDenied),
        }),
      );
    }

    if (isBetterAuth) {
      const credentials = { email: object.username, password: object.password };
      return Promise.resolve(function betterAuthSignInMw(
        req: Request,
        res: Response,
        next: NextFunction,
      ) {
        getBetterAuthSession().signIn(req, res, next, credentials);
      });
    }

    let skipVerification = false;

    return models.User.getByEmail(object.username)
      .then((user: { hasLoggedIn(): boolean } | null) => {
        if (user && !user.hasLoggedIn()) {
          skipVerification = true;
        }

        return models.User.check({
          email: object.username,
          password: object.password,
        });
      })
      .then((user: unknown) => {
        return Promise.resolve(function sessionMiddleware(
          req: SessionRequest,
          res: Response,
          next: NextFunction,
        ) {
          return spamPrevention
            .userLogin()
            .resetRequest(req)
            .then(() => {
              req.user = user;
              req.skipVerification = skipVerification;

              auth.session.createSession(req, res, next);
            }, next);
        });
      })
      .catch(async (err: Error & { errorType?: string }) => {
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
  delete(): Promise<SessionMiddleware> {
    if (isBetterAuth) {
      return Promise.resolve(function betterAuthSignOutMw(
        req: Request,
        res: Response,
        next: NextFunction,
      ) {
        getBetterAuthSession().signOut(req, res, next);
      });
    }

    return Promise.resolve(function logoutSessionMw(
      req: Request,
      res: Response,
      next: NextFunction,
    ) {
      auth.session.logout(req, res, next);
    });
  },
  sendVerification(): Promise<SessionMiddleware> {
    return Promise.resolve(function sendAuthCodeMw(
      req: Request,
      res: Response,
      next: NextFunction,
    ) {
      auth.session.sendAuthCode(req, res, next);
    });
  },
  verify(): Promise<SessionMiddleware> {
    return Promise.resolve(function verifyAuthCodeMw(
      req: Request,
      res: Response,
      next: NextFunction,
    ) {
      auth.session.verifyAuthCode(req, res, next);
    });
  },
};

// module.exports (not export): api/endpoints/index.js loads controllers via require().
module.exports = controller;
