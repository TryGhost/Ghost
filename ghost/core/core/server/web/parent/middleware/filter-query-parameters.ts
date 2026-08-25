import logging from '@tryghost/logging';
import type { NextFunction, Request, Response } from 'express';

import { queryParameterPolicy } from '../../query-parameter-policy';

const allowedQueryParameters: ReadonlySet<string> = new Set(
  queryParameterPolicy.public.map((entry) => entry.name),
);
const allowedContentApiQueryParameters: ReadonlySet<string> = new Set(
  queryParameterPolicy.contentApi.map((entry) => entry.name),
);

const CONTENT_API_PATH_PATTERN = /\/ghost\/api\/(?:(?:v[0-9]+|canary)\/content|content)(?:\/|$)/;

const EXEMPT_PATH_PATTERNS = [
  /\/ghost\/api(?:\/|$)/,
  /\/\.ghost(?:\/|$)/,
  /\/\.well-known(?:\/|$)/,
  /\/socket\.io(?:\/|$)/,
];
const MAX_LOGGED_PARAMETERS = 10;
const REQUEST_URL_BASE = 'http://ignored.example';

type FilterResult = {
  requestTarget: string;
  removedUnknownParameters: string[];
};

const replaceQueryString = (requestTarget: string, filteredRequestTarget: string) => {
  const requestUrl = new URL(requestTarget, REQUEST_URL_BASE);
  const filteredUrl = new URL(filteredRequestTarget, REQUEST_URL_BASE);

  return `${requestUrl.pathname}${filteredUrl.search}`;
};

const removeUnknownParameters = (searchParams: URLSearchParams, allowlist: ReadonlySet<string>) => {
  const removed = new Set<string>();

  for (const parameter of [...searchParams.keys()]) {
    if (!allowlist.has(parameter)) {
      searchParams.delete(parameter);
      removed.add(parameter);
    }
  }

  return removed;
};

const filterRequestTarget = (requestTarget: string): FilterResult => {
  const { pathname, searchParams } = new URL(requestTarget, REQUEST_URL_BASE);
  const contentApiRequest = CONTENT_API_PATH_PATTERN.test(pathname);
  const exemptPath = EXEMPT_PATH_PATTERNS.some((pattern) => pattern.test(pathname));

  if (!contentApiRequest && exemptPath) {
    return {
      requestTarget,
      removedUnknownParameters: [],
    };
  }

  const allowlist = contentApiRequest ? allowedContentApiQueryParameters : allowedQueryParameters;
  const removedUnknownParameters = removeUnknownParameters(searchParams, allowlist);

  if (removedUnknownParameters.size === 0) {
    return {
      requestTarget,
      removedUnknownParameters: [],
    };
  }

  const query = searchParams.toString();

  return {
    requestTarget: query ? `${pathname}?${query}` : pathname,
    removedUnknownParameters: [...removedUnknownParameters].sort(),
  };
};

/**
 * Applies Ghost(Pro)'s public query parameter allowlist in local development.
 *
 * Update the production policy and this manifest together when adding a parameter.
 * This middleware is enabled by the root pnpm dev Docker Compose configuration.
 */
export function filterQueryParameters(req: Request, _res: Response, next: NextFunction) {
  const requestTarget = req.originalUrl;
  const result = filterRequestTarget(requestTarget);

  if (result.requestTarget !== requestTarget) {
    const query = req.query;

    req.originalUrl = result.requestTarget;
    req.url = replaceQueryString(req.url, result.requestTarget);

    for (const parameter of result.removedUnknownParameters) {
      delete query[parameter];
    }
  }

  if (result.removedUnknownParameters.length > 0) {
    const strippedParameters = result.removedUnknownParameters
      .slice(0, MAX_LOGGED_PARAMETERS)
      .map(encodeURIComponent)
      .join(', ');
    const omittedParameterCount = result.removedUnknownParameters.length - MAX_LOGGED_PARAMETERS;
    const omittedParameters =
      omittedParameterCount > 0 ? `, and ${omittedParameterCount} more` : '';
    logging.warn(
      `[query-parameter-filter] Stripped undeclared query parameter(s) from ${req.path}: ${strippedParameters}${omittedParameters}`,
    );
  }

  next();
}
