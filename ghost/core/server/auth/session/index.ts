import type { NextFunction, Request, Response } from 'express';
import adapterManager from '../../services/adapter-manager';
import createSessionService from './session-service';
import type { Req } from './session-service';
import { sessionFromToken } from './session-from-token';
import createSessionMiddleware from './middleware';
import * as expressSession from './express-session';
import urlUtils from '../../../shared/url-utils';
import config from '../../../shared/config';
import type { SpamPrevention } from '../../web/shared/middleware/api/spam-prevention';
import * as errors from '@tryghost/errors';
import moment from 'moment';
import url from 'node:url';

const settingsCache = require('../../../shared/settings-cache');
const { GhostMailer } = require('../../lib/mail');
const { t } = require('../../../shared/i18n');
const models = require('../../models');
const { blogIcon } = require('../../lib/image');
const spamPrevention: SpamPrevention = require('../../web/shared/middleware/api/spam-prevention');

type SsoUser = { id: string; get(key: string): string };

// Share the email budget across sessions, IPs and Ghost instances.
async function limitVerificationEmailForUser(userId: string) {
  const result = await spamPrevention.verificationEmail().consume({ key: userId });
  if (!result.allowed) {
    throw new errors.TooManyRequestsError({
      message: `Too many verification emails requested, try again in ${moment.duration(result.retryAfterMs).humanize()}`,
      context: 'Too many attempts.',
    });
  }
}

function resetVerificationEmailForUser(userId: string) {
  return spamPrevention.verificationEmail().reset({ key: userId });
}

// TODO: We have too many lines here, should move functions out into a utils module

function getOriginOfRequest(req: Request | undefined): string | null {
  const getHeader = (name: string): string | undefined => {
    if (req && typeof req.get === 'function') {
      return req.get(name);
    }

    const headers: Record<string, string | string[] | undefined> =
      req && req.headers ? req.headers : {};
    const normalizedName = name.toLowerCase();
    return headers[normalizedName] as string | undefined;
  };

  const origin = getHeader('origin');
  const referrer =
    getHeader('referrer') ||
    getHeader('referer') ||
    urlUtils.getAdminUrl() ||
    urlUtils.getSiteUrl();

  if ((!origin && !referrer) || origin === 'null') {
    return null;
  }

  if (origin) {
    return origin;
  }

  const { protocol, host } = url.parse(referrer);
  if (protocol && host) {
    return `${protocol}//${host}`;
  }
  return null;
}

const mailer = new GhostMailer();

const sessionService = createSessionService({
  async consumeAuthCodeAttempt(challenge: string) {
    const result = await spamPrevention.userVerificationChallenge().consume({ key: challenge });
    if (!result.allowed) {
      throw new errors.TooManyRequestsError({
        message: 'Too many verification attempts. Please request a new code.',
        code: 'STAFF_VERIFICATION_ATTEMPTS_RATE_LIMITED',
      });
    }
  },
  getOriginOfRequest,
  getSession: expressSession.getSession,
  findUserById({ id }: { id: string }) {
    return models.User.findOne({ id, status: 'active' });
  },
  getSettingsCache(key: string) {
    return settingsCache.get(key);
  },
  isStaffDeviceVerificationDisabled() {
    // This config flag is set to true by default, so we need to check for false
    return config.get('security:staffDeviceVerification') !== true;
  },
  getBlogLogo() {
    return (
      blogIcon.getIconUrl({ absolute: true, fallbackToDefault: false }) ||
      'https://static.ghost.org/v4.0.0/images/ghost-orb-1.png'
    );
  },
  limitVerificationEmailForUser,
  resetVerificationEmailForUser,
  mailer,
  urlUtils,
  t,
});

// Looks funky but this is a "custom" piece of middleware
function createSessionFromToken() {
  const ssoAdapter = adapterManager.getAdapter('sso');

  // Provide the SSO adapter with the user lookups it needs, backed by the User
  // model. This keeps the model coupling here in core and lets adapter
  // implementations resolve users via the base class helpers instead of
  // requiring Ghost's model layer directly.
  ssoAdapter.setUserRepository({
    async getByEmail(email: string) {
      const user: SsoUser | null = await models.User.findOne({ email });
      return user ? { id: user.id, email: user.get('email'), status: user.get('status') } : null;
    },
    async getOwner() {
      const owner: SsoUser | null = await models.User.findOne({ role: 'Owner', status: 'all' });
      return owner
        ? { id: owner.id, email: owner.get('email'), status: owner.get('status') }
        : null;
    },
  });

  return sessionFromToken({
    callNextWithError: false,
    // The service attaches req.session itself before reading it
    createSession: sessionService.createVerifiedSessionForUser as (
      req: Request,
      res: Response,
      user: { id: string },
    ) => Promise<void>,
    findUserByLookup: ssoAdapter.getUserForIdentity.bind(ssoAdapter),
    getLookupFromToken: ssoAdapter.getIdentityFromCredentials.bind(ssoAdapter),
    getTokenFromRequest: ssoAdapter.getRequestCredentials.bind(ssoAdapter),
  });
}

async function initSession(req: Req, res: Response, next: NextFunction) {
  try {
    await expressSession.getSession(req, res);
    next();
  } catch (err) {
    next(err);
  }
}

export default {
  ...createSessionMiddleware({ sessionService }),
  createSessionFromToken,
  initSession,
  getOriginOfRequest,
  sessionService,
  deleteAllSessions: expressSession.deleteAllSessions,
};
