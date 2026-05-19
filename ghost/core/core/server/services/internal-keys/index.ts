import {AutoFillingMap} from '../../lib/auto-filling-map';

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
    'ghost-internal-frontend': 'content'
} as const satisfies Record<InternalIntegrationSlug, 'admin' | 'content'>;

export type ApiKeyType = typeof SLUG_KEY_TYPE[InternalIntegrationSlug];

/**
 * The read-only view of the internal-keys cache that most consumers receive.
 * Rotation orchestration uses the full Map surface (`.clear()`, `.delete()`)
 * via the writable export below.
 */
export type InternalKeys = ReadonlyMap<InternalIntegrationSlug, Promise<InternalApiKey>>;

/**
 * The writable view of the internal-keys cache. Only rotation orchestration
 * needs this — readers should accept `InternalKeys` instead.
 */
export type WritableInternalKeys = Map<InternalIntegrationSlug, Promise<InternalApiKey>>;

// models/index.js is the Bookshelf model registry — a JS module without
// TypeScript declarations. Use a typed require so we can call the model
// method without polluting the file with `any`. The generic constrains
// known internal slugs to their seeded type; arbitrary slugs accept any
// type.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const models = require('../../models') as {
    Integration: {
        // eslint-disable-next-line no-unused-vars
        getApiKeyBySlug<S extends string>(slug: S, type: S extends InternalIntegrationSlug ? typeof SLUG_KEY_TYPE[S] : ApiKeyType): Promise<InternalApiKey>;
    };
};

/**
 * Process-lifetime cache of internal-integration API keys, keyed by slug.
 * Exposed to consumers as a `ReadonlyMap<InternalIntegrationSlug, Promise<InternalApiKey>>`
 * so they only see `.get(slug)`; rotation orchestration uses the full Map
 * surface (`.delete(slug)`, `.clear()`) to invalidate after rotating the
 * underlying api_keys row.
 */
const internalKeys = new AutoFillingMap<InternalIntegrationSlug, Promise<InternalApiKey>>(
    slug => models.Integration.getApiKeyBySlug(slug, SLUG_KEY_TYPE[slug])
);

export default internalKeys;
