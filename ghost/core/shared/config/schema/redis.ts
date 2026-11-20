import { z } from 'zod';
import { tcpPort } from './primitives';

// the config loader turns all-digit environment values into numbers
const credential = z
  .union([z.string(), z.number()])
  .nullish()
  .transform((value) => (value === null || value === undefined ? undefined : String(value)));

/**
 * Connection settings for one Redis client, for any area that talks to Redis.
 * Keys are ioredis option names, so the parsed value is the client's options.
 * Loose: any other ioredis option passes through unchecked.
 */
export const redisConnection = z.looseObject({
  host: z.string().min(1).optional().meta({ description: 'Defaults to localhost.' }),
  port: tcpPort.optional().meta({ description: 'Defaults to 6379.' }),
  username: credential,
  password: credential,
  db: z.number().int().nonnegative().optional().meta({ description: 'Database index.' }),
  tls: z
    .union([z.boolean(), z.record(z.string(), z.unknown())])
    .optional()
    // ioredis wants an options object
    .transform((tls) => (tls === true ? {} : tls || undefined))
    .meta({
      description: 'true for TLS with default options, or Node TLS connect options.',
      examples: [true, { servername: 'redis.example.com' }],
    }),
});

export type RedisConnection = z.output<typeof redisConnection>;
