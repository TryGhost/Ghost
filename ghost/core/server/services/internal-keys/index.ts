import { defineService } from '../../../kernel/define-service';
import { AutoFillingMap } from '../../lib/auto-filling-map';

/**
 * Slug identifying an internal integration whose API key is consumed
 * in-process by Ghost itself.
 */
export type InternalIntegrationSlug = 'ghost-scheduler' | 'ghost-internal-frontend';

export type InternalApiKey = {
  id: string;
  secret: string;
};

// Each internal integration is seeded with a single API key whose type is
// fixed by fixtures. Encoded here so callers don't have to know.
const SLUG_KEY_TYPE = {
  'ghost-scheduler': 'admin',
  'ghost-internal-frontend': 'content',
} as const satisfies Record<InternalIntegrationSlug, 'admin' | 'content'>;

export type ApiKeyType = (typeof SLUG_KEY_TYPE)[InternalIntegrationSlug];

/**
 * The ready instance exposed through `.service`: an
 * `AutoFillingMap` whose `get` returns `Promise<InternalApiKey>` directly
 * (the override drops the `| undefined` from the structural `Map.get`
 * signature). Rotation orchestration uses the inherited `Map` surface
 * (`.clear()`, `.delete()`) to invalidate after rotating the underlying
 * api_keys row.
 */
export type InternalKeys = AutoFillingMap<InternalIntegrationSlug, Promise<InternalApiKey>>;

export default defineService('Internal Keys', () => {
  // The Bookshelf registry has no TypeScript declarations. Keep its typed
  // boundary and acquisition here; constructing the map does not query keys.
  const models = require('../../models') as {
    Integration: {
      getApiKeyBySlug<S extends string>(
        slug: S,
        type: S extends InternalIntegrationSlug ? (typeof SLUG_KEY_TYPE)[S] : ApiKeyType,
      ): Promise<InternalApiKey>;
    };
  };

  return new AutoFillingMap<InternalIntegrationSlug, Promise<InternalApiKey>>((slug) =>
    models.Integration.getApiKeyBySlug(slug, SLUG_KEY_TYPE[slug]),
  );
});
