import { z } from 'zod';

import { HELLO_MESSAGE_TYPE } from './rules.ts';

/**
 * The two window messages that set up the channel. Everything after them travels over the
 * `MessagePort` the connect message hands over, so these are the only messages either side
 * reads from `window` itself.
 *
 * Neither carries a protocol version. The hello names the SDK's own version for diagnostics
 * only, and nothing gates on it: Admin only ever adds exports and optional fields.
 *
 * Only the hello has a schema, as Admin reads it from a frame it does not trust. The connect
 * comes from Admin, which the SDK trusts, so `ConnectMessage` and its guard are in `rules.ts`.
 */

const SDK_VERSION_MAX_LENGTH = 100;

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
});

export type HelloMessage = z.infer<typeof HelloMessageSchema>;
