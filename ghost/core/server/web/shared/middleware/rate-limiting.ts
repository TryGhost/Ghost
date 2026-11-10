import logging from '@tryghost/logging';
import type { NextFunction, Request, Response } from 'express';
import { limitService } from '../../../services/limits';
import type { BackoffLimiter } from './api/backoff-limiter';
import type { SpamPrevention } from './api/spam-prevention';

// required, not imported, so tests can stub the limiters on the shared module
const spamPrevention: SpamPrevention = require('./api/spam-prevention');

type LimiterName = {
  [Name in keyof SpamPrevention]: SpamPrevention[Name] extends () => BackoffLimiter ? Name : never;
}[keyof SpamPrevention];

/** Middleware for a limiter, built on first use once config and the database are ready. */
const use = (name: LimiterName) => (req: Request, res: Response, next: NextFunction) =>
  spamPrevention[name]().middleware(req, res, next);

const rateLimiting = {
  staffInviteLimiter(req: Request, res: Response, next: NextFunction) {
    if (!limitService.isLimited('inviteEmails')) {
      return next();
    }
    return use('staffInviteBlock')(req, res, next);
  },
  upgradeApiLimiter: use('upgradeApiBlock'),
  upgradeLimiter: use('upgradeBlock'),
  globalBlock: use('globalBlock'),
  globalReset: use('globalReset'),
  userLogin: use('userLogin'),
  userReset: use('userReset'),
  sendVerificationCode: use('sendVerificationCode'),
  userVerification: use('userVerification'),
  privateBlog: use('privateBlog'),

  // Only unauthorized requests count: a successful one resets the count
  contentApiKey(req: Request, res: Response, next: NextFunction) {
    const limiter = spamPrevention.contentApiKey();

    return limiter.middleware(req, res, (err?: unknown) => {
      if (!err) {
        res.on('finish', () => {
          if (res.statusCode < 400) {
            limiter.resetRequest(req).catch((resetErr: unknown) => logging.error(resetErr));
          }
        });
      }
      return next(err);
    });
  },

  membersAuth: use('membersAuth'),
  membersAuthEnumeration: use('membersAuthEnumeration'),
  checkoutSessionGlobal: use('checkoutSessionGlobal'),

  checkoutSessionEmail(req: Request, res: Response, next: NextFunction) {
    if (!req.body?.customerEmail) {
      return next();
    }
    return use('checkoutSessionEmail')(req, res, next);
  },

  // Runs after loadIdentityTokenMember. A request without a verified identity
  // token skips the limiter; the controller rejects it without sending anything
  memberEmailUpdateLimiter(req: Request, res: Response, next: NextFunction) {
    if (!spamPrevention.memberIdentityKey(req)) {
      return next();
    }
    return use('memberEmailUpdateBlock')(req, res, next);
  },

  otcVerificationEnumeration: use('otcVerificationEnumeration'),
  otcVerification: use('otcVerification'),
  webmentionsLimiter: use('webmentionsBlock'),
  previewEmailLimiter: use('emailPreviewBlock'),
};

export type RateLimiting = typeof rateLimiting;

// a plain object, not ES exports, so CommonJS callers read it directly
module.exports = rateLimiting;
