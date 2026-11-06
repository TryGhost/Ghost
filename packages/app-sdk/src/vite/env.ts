import { z } from 'zod';

const isHttpUrl = (value: string) => {
  const protocol = URL.parse(value)?.protocol;
  return protocol === 'https:' || protocol === 'http:';
};

/**
 * The variables the plugin reads, from the environment or the mode's `.env` files. Each may be
 * left unset; one that's set must be something the plugin can use.
 */
export const GhostAppEnvSchema = z.object({
  /** The Ghost the dev server's install link opens, on a path of its own if Ghost is on one. */
  GHOST_URL: z
    .string()
    .refine(isHttpUrl, {
      error: ({ input }) =>
        `GHOST_URL must be Ghost's address, such as https://site.example.com, not ${String(input)}`,
    })
    .optional(),
  /**
   * The app's public address, which `vite build` signs the manifest for. A query or fragment
   * would land in the middle of the manifest's address, or swallow it, so it's refused, written
   * out or empty.
   */
  GHOST_APP_URL: z
    .string()
    .refine(
      (value) => isHttpUrl(value.endsWith('/') ? value : `${value}/`) && !/[?#]/.test(value),
      {
        error: ({ input }) =>
          `GHOST_APP_URL must be the app's public address, such as https://app.example.com, not ${String(input)}`,
      },
    )
    .optional(),
  /**
   * The Wrangler environment, which picks the Worker's `.dev.vars.<environment>` and
   * `.env.<environment>` files, so it's a name, never a path.
   */
  CLOUDFLARE_ENV: z
    .string()
    .regex(/^[^/\\]+$/, {
      error: ({ input }) =>
        `CLOUDFLARE_ENV must be the name of a Wrangler environment, such as staging, not ${String(input)}`,
    })
    .optional(),
});

export type GhostAppEnv = z.infer<typeof GhostAppEnvSchema>;

/** A variable's value, if the plugin can use it, or why it can't. */
export function checkEnv<Name extends keyof GhostAppEnv>(
  name: Name,
  value: string | undefined,
): { success: true; value: GhostAppEnv[Name] } | { success: false; problem: string } {
  const read = GhostAppEnvSchema.shape[name].safeParse(value);
  return read.success
    ? { success: true, value: read.data as GhostAppEnv[Name] }
    : { success: false, problem: `ghost-app: ${read.error.issues[0]!.message}` };
}
