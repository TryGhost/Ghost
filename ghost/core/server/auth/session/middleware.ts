import type { NextFunction, Response } from 'express';
import * as errors from '@tryghost/errors';
import type { Req, SessionService, User } from './session-service';

type SessionRequest = Req & { user?: User; skipVerification?: boolean };
type LoginRequest = SessionRequest & { user: User };

export default function SessionMiddleware({ sessionService }: { sessionService: SessionService }) {
  async function createSession(req: LoginRequest, res: Response, next: NextFunction) {
    try {
      if (req.skipVerification) {
        await sessionService.createVerifiedSessionForUser(req, res, req.user);
      } else {
        await sessionService.createSessionForUser(req, res, req.user);
      }

      const isVerified = await sessionService.isVerifiedSession(req, res);
      if (isVerified) {
        res.sendStatus(201);
      } else {
        await sessionService.sendAuthCodeToUser(req, res);
        throw new errors.NoPermissionError({
          code: sessionService.isVerificationRequired()
            ? '2FA_TOKEN_REQUIRED'
            : '2FA_NEW_DEVICE_DETECTED',
          context:
            'A 6-digit sign-in verification code has been sent to your email to keep your account safe.',
          errorType: 'Needs2FAError',
          message: 'User must verify session to login.',
        });
      }
    } catch (err) {
      next(err);
    }
  }

  async function logout(req: Req, res: Response, next: NextFunction) {
    try {
      await sessionService.removeUserForSession(req, res);
      res.sendStatus(204);
    } catch (err) {
      if (errors.utils.isGhostError(err as Error)) {
        next(err);
      } else {
        next(new errors.InternalServerError({ err: err as Error }));
      }
    }
  }

  async function authenticate(req: SessionRequest, res: Response, next: NextFunction) {
    try {
      const user = await sessionService.getUserForSession(req, res);
      if (user) {
        const isVerified = await sessionService.isVerifiedSession(req, res);
        if (!isVerified) {
          return next();
        }

        // Do not nullify `req.user` as it might have been already set
        // in a previous middleware (authorize middleware).
        req.user = user;
      }
      next();
    } catch (err) {
      next(err);
    }
  }

  async function sendAuthCode(req: Req, res: Response, next: NextFunction) {
    try {
      await sessionService.sendAuthCodeToUser(req, res);

      res.sendStatus(200);
    } catch (err) {
      next(err);
    }
  }

  async function verifyAuthCode(req: Req, res: Response, next: NextFunction) {
    try {
      const verified = await sessionService.verifyAuthCodeForUser(req, res);

      if (verified) {
        await sessionService.verifySession(req, res);
        res.sendStatus(200);
      } else {
        res.sendStatus(401);
      }
    } catch (err) {
      next(err);
    }
  }

  return {
    createSession: createSession,
    logout: logout,
    authenticate: authenticate,
    sendAuthCode: sendAuthCode,
    verifyAuthCode: verifyAuthCode,
  };
}
