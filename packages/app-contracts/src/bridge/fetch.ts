import { z } from 'zod';

import { isContainedPath } from './paths.ts';

/** As long as an app's own path, which an Admin API path with its query easily fits. */
export const FETCH_PATH_MAX_LENGTH = 2048;

/** 1 MiB, in UTF-8 bytes. Bodies are JSON and text; uploads are out of scope. */
export const FETCH_BODY_MAX_BYTES = 1024 * 1024;

const FETCH_HEADERS_MAX_COUNT = 50;
const FETCH_HEADER_VALUE_MAX_LENGTH = 8192;

/** The methods the Admin API answers. Written in uppercase; the SDK normalises what apps pass. */
export const FETCH_METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD'] as const;

// A header name is an HTTP token. Anything else would make the browser's fetch throw, so it is
// refused here with a message rather than there with a TypeError.
const HEADER_NAME = /^[!#$%&'*+.^_`|~0-9a-z-]+$/i;

// Line breaks and NUL are what header injection is made of, and fetch refuses them anyway.
const HEADER_VALUE = /^[^\r\n\0]*$/;

const utf8 = new TextEncoder();

/**
 * A request an app asks Admin to make to the Admin API on its behalf. The path is never a URL:
 * Admin resolves it against its own Admin API root with `resolveAdminApiPath` and checks it
 * against the blocklist before anything reaches the network.
 *
 * Unknown fields are refused rather than ignored, so an option Admin does not support fails
 * loudly instead of the request going out without it.
 */
export const FetchRequestSchema = z
  .strictObject({
    path: z
      .string('Expected an Admin API path such as /posts/')
      .max(
        FETCH_PATH_MAX_LENGTH,
        `Expected an Admin API path of at most ${FETCH_PATH_MAX_LENGTH} characters`,
      )
      .refine(isContainedPath, 'Expected an Admin API path such as /posts/, not a URL'),
    method: z.enum(FETCH_METHODS, `Expected a method of: ${FETCH_METHODS.join(', ')}`).optional(),
    headers: z
      .record(
        z.string(),
        z
          .string('Expected header values to be text')
          .max(
            FETCH_HEADER_VALUE_MAX_LENGTH,
            `Expected header values of at most ${FETCH_HEADER_VALUE_MAX_LENGTH} characters`,
          )
          .regex(HEADER_VALUE, 'Expected header values on one line'),
        'Expected headers as an object of names to values',
      )
      .superRefine((headers, ctx) => {
        const names = Object.keys(headers);
        if (names.length > FETCH_HEADERS_MAX_COUNT) {
          ctx.addIssue({
            code: 'custom',
            message: `Expected at most ${FETCH_HEADERS_MAX_COUNT} headers`,
          });
        }
        for (const name of names) {
          if (!HEADER_NAME.test(name)) {
            ctx.addIssue({
              code: 'custom',
              message: 'Expected header names made of letters, digits and -',
              path: [name],
            });
          }
        }
      })
      .optional(),
    body: z
      .string('Expected the body as text')
      // Every UTF-16 code unit is at least one UTF-8 byte, so counting characters first keeps
      // a huge body from being encoded just to be refused.
      .max(FETCH_BODY_MAX_BYTES, { message: 'Expected a body of at most 1 MiB', abort: true })
      .refine(
        (body) => utf8.encode(body).byteLength <= FETCH_BODY_MAX_BYTES,
        'Expected a body of at most 1 MiB',
      )
      .optional(),
  })
  .refine(
    ({ method = 'GET', body }) => body === undefined || (method !== 'GET' && method !== 'HEAD'),
    { message: 'Expected no body on a GET or HEAD request', path: ['body'] },
  );

export type FetchRequest = z.infer<typeof FetchRequestSchema>;

export type FetchMethod = (typeof FETCH_METHODS)[number];

/**
 * The Admin API's answer, as plain data so it can cross the channel. The SDK turns it back
 * into a `Response`, which only accepts statuses from 200 to 599; fetch never hands script an
 * informational one.
 */
export const FetchResponseSchema = z.object({
  status: z.int().min(200).max(599),
  statusText: z.string(),
  headers: z.record(z.string(), z.string()),
  body: z.string(),
});

export type FetchResponse = z.infer<typeof FetchResponseSchema>;
