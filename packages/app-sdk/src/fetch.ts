import {
  FETCH_METHODS,
  isContainedPath,
  isFetchResponse,
  isRecord,
  type FetchMethod,
  type FetchRequest,
} from '@tryghost/app-contracts';

import { GhostAppError, invalidArgument, invalidPath } from './errors.ts';
import type { GhostFetchInit, JsonBody } from './types.ts';

// The statuses a `Response` must be built without a body for, or its constructor throws.
const NULL_BODY_STATUSES = new Set([204, 205, 304]);

function isJsonBody(value: unknown): value is JsonBody {
  if (Array.isArray(value)) {
    return true;
  }
  if (!isRecord(value)) {
    return false;
  }
  const prototype: unknown = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function toHeaders(init: HeadersInit | undefined): Record<string, string> {
  let headers: Headers;
  try {
    headers = new Headers(init);
  } catch (error) {
    throw new GhostAppError('invalid_argument', 'Expected headers with valid names and values', {
      cause: error,
    });
  }
  // Lowercased by `Headers`, so a content type the app set is found whatever its case.
  return Object.fromEntries(headers.entries());
}

/**
 * Turns `fetch(path, init)` into the plain request Admin takes. Only what is plainly wrong is
 * refused here, with the same rules Admin applies; Admin checks everything again.
 */
export function toFetchRequest(path: string, init: GhostFetchInit = {}): FetchRequest {
  if (!isContainedPath(path)) {
    throw invalidPath('Expected an Admin API path such as /posts/, not a URL');
  }

  const method = (init.method ?? 'GET').toUpperCase() as FetchMethod;
  if (!FETCH_METHODS.includes(method)) {
    throw invalidArgument(`Expected a method of: ${FETCH_METHODS.join(', ')}`);
  }

  const headers = toHeaders(init.headers);
  const request: FetchRequest = { path, method };

  if (init.body !== undefined && init.body !== null) {
    if (method === 'GET' || method === 'HEAD') {
      throw invalidArgument('Expected no body on a GET or HEAD request');
    }
    if (typeof init.body === 'string') {
      request.body = init.body;
    } else if (isJsonBody(init.body)) {
      request.body = JSON.stringify(init.body);
      headers['content-type'] ??= 'application/json';
    } else {
      // Binary and streamed bodies cannot cross the channel as text.
      throw invalidArgument('Expected the body as text, or as an object or array to send as JSON');
    }
  }

  if (Object.keys(headers).length > 0) {
    request.headers = headers;
  }
  return request;
}

/** Rebuilds Admin's answer as the `Response` the app would have had from `fetch`. */
export function toResponse(answer: unknown): Response {
  if (!isFetchResponse(answer)) {
    throw new GhostAppError(
      'rejected',
      "Ghost answered with a response this SDK doesn't understand",
    );
  }
  return new Response(NULL_BODY_STATUSES.has(answer.status) ? null : answer.body, {
    status: answer.status,
    statusText: answer.statusText,
    headers: answer.headers,
  });
}
