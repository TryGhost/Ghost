import {z} from 'zod';

const envSchema = z.object({
    GHOST_DB_URL: z.string().default('file:./ghost.db'),
    GHOST_DB_AUTH_TOKEN: z.string().optional(),
    GHOST_PORT: z.coerce.number().int().positive().default(2369)
});

export type Env = z.infer<typeof envSchema>;

export const loadEnv = () => envSchema.parse(process.env);
