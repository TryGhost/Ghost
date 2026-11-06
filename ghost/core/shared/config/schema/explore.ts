import { z } from 'zod';

/**
 * Ghost Explore. Only production config sets this, so it is optional.
 *
 * Closed: its two readers - the explore ping and the public config endpoint -
 * read only the keys named here.
 *
 * @TODO: Ghost 7.0 - tighten both URLs to `z.url({ protocol: /^https?$/ })`,
 * still allowing `''`, which turns the ping off. Stricter than 6.x accepts.
 */
export const explore = z
  .object({
    update_url: z
      .string()
      .optional()
      .meta({
        description: 'Where the site sends its Explore ping. Pinging is skipped when unset.',
        examples: ['https://explore.ghost.org/api/update'],
      }),
    testimonials_url: z
      .string()
      .optional()
      .meta({
        description: 'Explore testimonials endpoint, passed to Admin through the public config.',
        examples: ['https://explore.ghost.org/api/testimonials'],
      }),
  })
  .optional()
  .meta({ description: 'Ghost Explore, the directory of Ghost sites.' });
