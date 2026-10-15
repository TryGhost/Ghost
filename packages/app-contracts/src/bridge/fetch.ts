import { z } from 'zod';

import {
  ARGUMENT_MESSAGES,
  FETCH_METHODS,
  isContainedPath,
  isMultipartContentType,
  isReservedRequestHeader,
  methodAllowsBody,
} from './rules.ts';

/** The same limit as an app path. An Admin API path with its query fits easily within it. */
export const FETCH_PATH_MAX_LENGTH = 2048;

/** 1 MiB, in UTF-8 bytes. Bodies are JSON and text; a multipart content type is refused. */
export const FETCH_BODY_MAX_BYTES = 1024 * 1024;

const FETCH_HEADERS_MAX_COUNT = 50;
const FETCH_HEADER_VALUE_MAX_LENGTH = 8192;

// A header name must be an HTTP token. The browser's fetch throws a TypeError on anything else,
// so the schema refuses it here with a clear message instead.
const HEADER_NAME = /^[!#$%&'*+.^_`|~0-9a-z-]+$/i;

// Latin-1 text, with tabs but no other control characters, as HTTP allows. Fetch throws a
// TypeError on anything else, which Admin could only report as a failure to reach its own API.
// Line breaks are also how header injection works.
const HEADER_VALUE = /^[\t\x20-\x7e\x80-\xff]*$/;

const utf8 = new TextEncoder();

/**
 * A request that an app asks Admin to make to the Admin API on its behalf. The path is never a
 * URL: Admin resolves and checks it with `checkAdminApiPath` before sending anything.
 *
 * Unknown fields are refused, so an option Admin doesn't support fails loudly instead of being
 * silently left out of the request.
 */
export const FetchRequestSchema = z
  .strictObject({
    path: z
      .string('Expected an Admin API path such as /posts/')
      .max(
        FETCH_PATH_MAX_LENGTH,
        `Expected an Admin API path of at most ${FETCH_PATH_MAX_LENGTH} characters`,
      )
      .refine(isContainedPath, ARGUMENT_MESSAGES.fetchPath),
    method: z.enum(FETCH_METHODS, ARGUMENT_MESSAGES.fetchMethod).optional(),
    headers: z
      .record(
        z.string(),
        z
          .string('Expected header values to be text')
          .max(
            FETCH_HEADER_VALUE_MAX_LENGTH,
            `Expected header values of at most ${FETCH_HEADER_VALUE_MAX_LENGTH} characters`,
          )
          .regex(
            HEADER_VALUE,
            'Expected header values on one line, in Latin-1 and without control characters',
          ),
        'Expected headers as an object of names to values',
      )
      .superRefine((headers, ctx) => {
        const entries = Object.entries(headers);
        if (entries.length > FETCH_HEADERS_MAX_COUNT) {
          ctx.addIssue({
            code: 'custom',
            message: `Expected at most ${FETCH_HEADERS_MAX_COUNT} headers`,
          });
        }
        for (const [name, value] of entries) {
          if (!HEADER_NAME.test(name)) {
            ctx.addIssue({
              code: 'custom',
              message: "Expected header names of letters, digits and !#$%&'*+-.^_`|~ alone",
              path: [name],
            });
          } else if (isReservedRequestHeader(name)) {
            ctx.addIssue({
              code: 'custom',
              message: ARGUMENT_MESSAGES.reservedHeader(name),
              path: [name],
            });
          } else if (name.toLowerCase() === 'content-type' && isMultipartContentType(value)) {
            ctx.addIssue({ code: 'custom', message: ARGUMENT_MESSAGES.multipart, path: [name] });
          }
        }
      })
      .optional(),
    body: z
      .string('Expected the body as text')
      // Every UTF-16 code unit is at least one UTF-8 byte, so checking the character count first
      // avoids encoding a huge body only to refuse it.
      .max(FETCH_BODY_MAX_BYTES, { message: 'Expected a body of at most 1 MiB', abort: true })
      .refine(
        (body) => utf8.encode(body).byteLength <= FETCH_BODY_MAX_BYTES,
        'Expected a body of at most 1 MiB',
      )
      .optional(),
  })
  .refine(({ method = 'GET', body }) => body === undefined || methodAllowsBody(method), {
    message: ARGUMENT_MESSAGES.fetchBody,
    path: ['body'],
  });

export type FetchRequest = z.infer<typeof FetchRequestSchema>;
