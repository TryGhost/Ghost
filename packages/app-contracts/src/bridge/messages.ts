import { z } from 'zod';

import { HELLO_MESSAGE_TYPE } from './rules.ts';

/**
 * The two window messages that set up the channel; everything after them travels over the
 * `MessagePort` the connect message hands over.
 *
 * Neither carries a protocol version. The hello names the SDK's version for diagnostics only,
 * and nothing gates on it: Admin only ever adds exports and optional fields.
 *
 * Only the hello has a schema, as Admin reads it from an untrusted frame. The connect comes
 * from Admin, which the SDK trusts, so `ConnectMessage` and its guard are in `rules.ts`.
 */

const SDK_VERSION_MAX_LENGTH = 100;
const DOCUMENT_ID_MAX_LENGTH = 64;

/**
 * Unknown fields are dropped rather than refused, unlike the calls over the channel: a newer
 * SDK may say more in its hello, and an older Admin refusing it would never connect at all.
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
   * A random ID the SDK picks once per document and sends with every hello, so Admin can tell a
   * repeated hello from a document it has connected from a new document in the same frame,
   * after a reload, a form post or a link. Optional: older SDKs leave it out, and Admin then
   * cannot tell the two apart.
   */
  document: z
    .string('Expected the document ID as text')
    .min(1, 'Expected a document ID')
    .max(
      DOCUMENT_ID_MAX_LENGTH,
      `Expected a document ID of at most ${DOCUMENT_ID_MAX_LENGTH} characters`,
    )
    .optional(),
});

export type HelloMessage = z.infer<typeof HelloMessageSchema>;
