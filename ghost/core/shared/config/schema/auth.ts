import { z } from 'zod';

export const authEngine = z.enum(['legacy', 'better-auth']).meta({
  description:
    'Staff authentication engine. `better-auth` is in development and needs MySQL and the in-development auth tables.',
  examples: ['legacy', 'better-auth'],
});

export type AuthEngine = z.infer<typeof authEngine>;

/**
 * Staff authentication. The engine decides what boot builds and how Express is
 * wired. defaults.json supplies `engine`, so it is always present. Closed:
 * `engine` is the only `auth:` key and nothing reads another.
 */
export const auth = z.object({
  engine: authEngine,
});
