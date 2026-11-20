import { apiKey } from '@better-auth/api-key';
import { bearerToken, PAT_CONFIG_ID, PAT_PREFIX } from '../../bearer';
import { ghostApiKeySchema } from '../ghost-models';

const DAY_SECONDS = 24 * 60 * 60;

/**
 * Personal Access Tokens on Better Auth's `apiKey` plugin (plan §3.3, Phase 4).
 * Keys are stored as SHA-256 hashes in `api_tokens`; `resolvePrincipal`
 * verifies them with `auth.api.verifyApiKey`. Site tokens add a configuration
 * here.
 */
export const ghostApiTokens = () =>
  apiKey(
    [
      {
        configId: PAT_CONFIG_ID,
        references: 'user',
        defaultPrefix: PAT_PREFIX,
        // The prefix plus four characters, enough to tell tokens apart in a list
        startingCharactersConfig: { charactersLength: PAT_PREFIX.length + 4 },
        // Only read if enableSessionForAPIKeys is ever turned on
        customAPIKeyGetter: (ctx) =>
          bearerToken(ctx.headers?.get('authorization') ?? undefined) || null,
        // Never a session: the Admin API builds the principal itself, and a
        // session would reach Better Auth's own session-protected endpoints
        enableSessionForAPIKeys: false,
        // Every token expires: 90 days unless asked otherwise, at most a year
        keyExpiration: {
          defaultExpiresIn: 90 * DAY_SECONDS,
          minExpiresIn: 1,
          maxExpiresIn: 365,
        },
        // Per key, counted on its row
        rateLimit: { enabled: true, timeWindow: 60 * 1000, maxRequests: 600 },
      },
    ],
    { schema: ghostApiKeySchema },
  );
