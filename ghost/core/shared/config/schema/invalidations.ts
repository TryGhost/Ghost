import { z } from 'zod';
import { knownKeys } from './primitives';
import { redisConnection } from './redis';

const transportDescription =
  'How instances serving one site tell each other a cache changed. `local` has no peers.';

const local = knownKeys('invalidations', {
  transport: z.literal('local').meta({ description: transportDescription }),
});

const redis = knownKeys('invalidations', {
  transport: z.literal('redis').meta({ description: transportDescription }),
  redis: redisConnection.optional().meta({ description: 'Defaults to Redis on localhost.' }),
  channel: z
    .string()
    .min(1)
    .optional()
    .meta({
      description:
        'Pub/sub channel. Defaults to one per site and environment, derived from `url` and `env`.',
      examples: ['ghost:invalidations:production:example.com'],
    }),
});

/**
 * Cross-instance cache invalidation, a union on `transport`. defaults.json
 * supplies `local`, so it is always present.
 */
export const invalidations = z.discriminatedUnion('transport', [local, redis]).meta({
  description: 'Cache invalidation between instances. Every other key depends on `transport`.',
  examples: [
    { transport: 'local' },
    { transport: 'redis', redis: { host: 'redis.internal', port: 6379 } },
  ],
});

export type InvalidationsConfig = z.output<typeof invalidations>;
