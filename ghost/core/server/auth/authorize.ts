import type { NextFunction, Request, Response } from 'express';
import errors from '@tryghost/errors';
import tpl from '@tryghost/tpl';
import type { AuthenticatedRequest } from './principal';

type AuthorizeRequest = Request & AuthenticatedRequest & { member?: unknown };

const messages = {
  authorizationFailed: 'Authorization failed',
  missingContentMemberOrIntegration:
    'Unable to determine the authenticated member or integration. Check the supplied Content API Key and ensure cookies are being passed through if member auth is failing.',
  missingAdminUserOrIntegration:
    'Unable to determine the authenticated user or integration. Check that cookies are being passed through if using session authentication.',
};

export function authorizeContentApi(req: AuthorizeRequest, res: Response, next: NextFunction) {
  const hasApiKey = req.api_key && req.api_key.id;
  const hasMember = req.member;
  if (hasApiKey) {
    return next();
  }
  if (hasMember) {
    return next();
  }
  return next(
    new errors.NoPermissionError({
      message: tpl(messages.authorizationFailed),
      context: tpl(messages.missingContentMemberOrIntegration),
    }),
  );
}

export function authorizeAdminApi(req: AuthorizeRequest, res: Response, next: NextFunction) {
  const hasUser = req.user && req.user.id;
  const hasApiKey = req.api_key && req.api_key.id;
  // Until scopes are enforced (PLA-639), an app needs a user to act for
  const isApp = req.auth?.kind === 'app';

  if (hasUser || (hasApiKey && !isApp)) {
    return next();
  } else {
    return next(
      new errors.NoPermissionError({
        message: tpl(messages.authorizationFailed),
        context: tpl(messages.missingAdminUserOrIntegration),
      }),
    );
  }
}
