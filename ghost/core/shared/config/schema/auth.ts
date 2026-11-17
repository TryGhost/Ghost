import { z } from 'zod';

export const authEngine = z.enum(['legacy', 'better-auth']).meta({
  description:
    'Staff authentication engine. `better-auth` is in development and needs MySQL and the in-development auth tables.',
  examples: ['legacy', 'better-auth'],
});

export type AuthEngine = z.infer<typeof authEngine>;

export const betterAuthDev = z.boolean().meta({
  description:
    "Development only: keep Better Auth's data, including legacy passwords, in the in-development auth tables. Required by the `better-auth` engine; Ghost refuses it without createInDevelopmentTables.",
  examples: [true, false],
  hidden: true,
});

/**
 * Staff authentication. The engine decides what boot builds and how Express is
 * wired; `betterAuthDev` decides whether Ghost keeps Better Auth's data, under
 * either engine. defaults.json supplies both, so they are always present.
 * Closed: nothing reads another `auth:` key.
 */
export const auth = z.object({
  engine: authEngine,
  betterAuthDev,
});
