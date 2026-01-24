import {z} from 'zod';

const envSchema = z.object({
    GHOST_DB_URL: z.string().default('file:./ghost.db'),
    GHOST_DB_AUTH_TOKEN: z.string().optional(),
    GHOST_PORT: z.coerce.number().int().positive().default(2369),
    GHOST_SIGNUP_POLICY: z.enum(['open', 'invite-only', 'paid-only', 'none']).default('open'),
    GHOST_SSO_PROVIDERS: z.string().optional()
});

export type Env = z.infer<typeof envSchema>;

export const loadEnv = () => envSchema.parse(process.env);
