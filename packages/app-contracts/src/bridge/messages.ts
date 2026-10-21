import { z } from 'zod';

import { HELLO_MESSAGE_TYPE } from './rules.ts';

/**
 * The two window messages that set up the channel. Everything after them travels over the
 * `MessagePort` that the connect message carries.
 *
 * Neither message carries a protocol version. The hello includes the SDK's version for
 * diagnostics only, and no behaviour depends on it: Admin only ever adds exports and optional
 * fields.
 *
 * Only the hello has a schema, because Admin reads it from an untrusted frame. The connect
 * comes from Admin, which the SDK trusts, so `ConnectMessage` and its guard live in `rules.ts`.
 */

const SDK_VERSION_MAX_LENGTH = 100;
const DOCUMENT_ID_MAX_LENGTH = 64;

/**
 * Unknown fields are dropped rather than refused, unlike in the calls over the channel. A newer
 * SDK may add fields to its hello, and if an older Admin refused them, the page would never
 * connect.
 */
export const HelloMessageSchema = z.object({
  type: z.literal(HELLO_MESSAGE_TYPE),
  sdk: z
    .string('Expected the SDK version')
    .max(
      SDK_VERSION_MAX_LENGTH,
      `Expected an SDK version of at most ${SDK_VERSION_MAX_LENGTH} characters`,
    ),
  /**
   * An ID for the page's document. It stays the same in every hello the document sends.
   * Admin uses it to tell whether a hello comes from the document it already connected or
   * from a new document in the same frame, loaded by a reload, a form post or a link. The SDK
   * makes a random one when it loads.
   */
  document: z
    .string('Expected the document ID as text')
    .min(1, 'Expected a document ID')
    .max(
      DOCUMENT_ID_MAX_LENGTH,
      `Expected a document ID of at most ${DOCUMENT_ID_MAX_LENGTH} characters`,
    ),
});

export type HelloMessage = z.infer<typeof HelloMessageSchema>;
