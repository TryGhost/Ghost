import {
  ARGUMENT_MESSAGES,
  FETCH_METHODS,
  isContainedPath,
  isFetchResponse,
  isMultipartContentType,
  isRecord,
  isReservedRequestHeader,
  methodAllowsBody,
  type FetchMethod,
  type FetchRequest,
} from '@tryghost/app-contracts';

import { GhostAppError, invalidArgument, invalidPath } from './errors.ts';
import type { GhostFetchInit, JsonBody } from './types.ts';

const JSON_BODY = 'Expected a body that can be sent as JSON';

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

// A cycle or a BigInt makes `JSON.stringify` throw, and a `toJSON` that answers nothing
// makes it answer nothing.
function toJson(body: JsonBody): string {
  let json: string | undefined;
  try {
    json = JSON.stringify(body) as string | undefined;
  } catch (error) {
    throw new GhostAppError('invalid_argument', JSON_BODY, { cause: error });
  }
  if (json === undefined) {
    throw invalidArgument(JSON_BODY);
  }
  return json;
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
  const entries = [...headers.entries()];
  const reserved = entries.find(([name]) => isReservedRequestHeader(name));
  if (reserved) {
    throw invalidArgument(ARGUMENT_MESSAGES.reservedHeader(reserved[0]));
  }
  if (isMultipartContentType(headers.get('content-type') ?? '')) {
    throw invalidArgument(ARGUMENT_MESSAGES.multipart);
  }
  return Object.fromEntries(entries);
}

/**
 * Turns `fetch(path, init)` into the plain request Admin takes. Only what is plainly wrong is
 * refused here, with the same rules Admin applies; Admin checks everything again.
 */
export function toFetchRequest(path: string, init: GhostFetchInit = {}): FetchRequest {
  if (!isContainedPath(path)) {
    throw invalidPath(ARGUMENT_MESSAGES.fetchPath);
  }
  // Typed away, but a page without TypeScript can pass anything.
  if (typeof init !== 'object' || init === null) {
    throw invalidArgument('Expected options such as { method, headers, body }');
  }

  const { method: given = 'GET' } = init as { method?: unknown };
  const method = (typeof given === 'string' ? given.toUpperCase() : given) as FetchMethod;
  if (!FETCH_METHODS.includes(method)) {
    throw invalidArgument(ARGUMENT_MESSAGES.fetchMethod);
  }

  const headers = toHeaders(init.headers);
  const request: FetchRequest = { path, method };

  if (init.body !== undefined && init.body !== null) {
    if (!methodAllowsBody(method)) {
      throw invalidArgument(ARGUMENT_MESSAGES.fetchBody);
    }
    if (typeof init.body === 'string') {
      request.body = init.body;
    } else if (isJsonBody(init.body)) {
      request.body = toJson(init.body);
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
