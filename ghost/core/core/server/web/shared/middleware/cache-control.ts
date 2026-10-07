import * as errors from '@tryghost/errors';
import type { RequestHandler } from 'express';

type CacheControlPublicOptions = Readonly<{ maxAge?: number }>;

export const cacheControl = (
  ...args: ['public', CacheControlPublicOptions?] | ['private' | 'noCache']
): RequestHandler => {
  const [profile, options] = args;

  let value: string;
  switch (profile) {
    case 'public':
      value = `public, max-age=${options?.maxAge ?? 0}`;
      break;
    case 'private':
      value =
        'no-cache, private, no-store, must-revalidate, max-stale=0, post-check=0, pre-check=0';
      break;
    case 'noCache':
      value =
        'no-cache, max-age=0, no-store, must-revalidate, max-stale=0, post-check=0, pre-check=0';
      break;
    default: {
      const exhaustiveCheck: never = profile;
      throw new errors.IncorrectUsageError({
        message: `Invalid cache control profile: ${exhaustiveCheck}`,
      });
    }
  }

  return function cacheControlHeaders(_req, res, next) {
    res.setHeader('Cache-Control', value);
    next();
  };
};
