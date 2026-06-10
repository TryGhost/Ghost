import {z} from 'zod';

const envSchema = z.object({
    GHOST_DB_URL: z.string().default('file:./ghost.db'),
    GHOST_DB_AUTH_TOKEN: z.string().optional(),
    GHOST_PORT: z.coerce.number().int().positive().default(2369),
    GHOST_SIGNUP_POLICY: z.enum(['open', 'invite-only', 'paid-only', 'none']).default('open'),
    GHOST_SSO_PROVIDERS: z.string().optional(),
    GHOST_QUEUE_PROVIDER: z.enum(['memory']).default('memory'),
    GHOST_THEME_STORE: z.enum(['fs', 'r2']).default('fs'),
    GHOST_THEME_FS_ROOT: z.string().default('./content/themes'),
    GHOST_THEME_R2_BASE_URL: z.string().optional(),
    GHOST_THEME_R2_BUNDLE_PATH: z.string().default('themes/{themeId}/bundle.mjs'),
    GHOST_THEME_R2_ASSET_PATH: z.string().default('themes/{themeId}/assets/{path}')
});

export type Env = z.infer<typeof envSchema>;

export const loadEnv = () => envSchema.parse(process.env);
