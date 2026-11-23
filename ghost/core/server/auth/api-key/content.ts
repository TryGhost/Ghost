import type { NextFunction, Request, Response } from 'express';
import errors from '@tryghost/errors';
import tpl from '@tryghost/tpl';
import limits from '../../../../shared/limits';
import type { AuthenticatedRequest } from '../principal';
import type { LoadedApiKey } from './admin';

const models = require('../../models');

const messages = {
  invalidRequest: 'Invalid Request',
  unknownContentApiKey: 'Unknown Content API Key',
  invalidApiKeyType: 'Invalid API Key type',
};

export const authenticateContentApiKey = async function authenticateContentApiKey(
  req: Request & AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  // allow fallthrough to other auth methods or final ensureAuthenticated check
  if (!req.query || !req.query.key) {
    return next();
  }

  if (req.query.key.constructor === Array) {
    return next(
      new errors.BadRequestError({
        message: tpl(messages.invalidRequest),
        code: 'INVALID_REQUEST',
      }),
    );
  }

  const key = req.query.key;

  try {
    const apiKey: LoadedApiKey | null = await models.ApiKey.findOne(
      { secret: key },
      { withRelated: ['integration'] },
    );

    if (!apiKey) {
      return next(
        new errors.UnauthorizedError({
          message: tpl(messages.unknownContentApiKey),
          code: 'UNKNOWN_CONTENT_API_KEY',
        }),
      );
    }

    if (apiKey.get('type') !== 'content') {
      return next(
        new errors.UnauthorizedError({
          message: tpl(messages.invalidApiKeyType),
          code: 'INVALID_API_KEY_TYPE',
        }),
      );
    }

    // CASE: blocking all non-internal: "custom" and "builtin" integration requests when the limit is reached
    if (
      limits.service.isLimited('customIntegrations') &&
      apiKey.relations.integration &&
      !['internal', 'core'].includes(apiKey.relations.integration.get('type') as string)
    ) {
      // NOTE: using "checkWouldGoOverLimit" instead of "checkIsOverLimit" here because flag limits don't have
      //       a concept of measuring if the limit has been surpassed
      await limits.service.errorIfWouldGoOverLimit('customIntegrations');
    }

    // authenticated OK, store the api key on the request for later checks and logging
    req.api_key = apiKey;

    next();
  } catch (err) {
    if (err instanceof errors.HostLimitError) {
      next(err);
    } else {
      next(new errors.InternalServerError({ err: err as Error }));
    }
  }
};
