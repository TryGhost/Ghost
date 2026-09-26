import { z } from 'zod';

/**
 * Deliberately only as strict as the `checkUrlProtocol` assertion that has
 * always run at the end of the config load - anything this rejects, boot
 * already rejected. Tighten to a full URL check in its own change.
 */
export const urlSchema = z.string().regex(/^https?:\/\//i, {
  message: 'URL in config must be provided with protocol, eg. "http://my-ghost-blog.com"',
});
