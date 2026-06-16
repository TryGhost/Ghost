// The service exports its class via `module.exports =` (an `export =`) so JS
// `require()` callers receive the class directly. TypeScript can't bind that to
// a default `import`, so we `require()` it at runtime and describe the public
// surface the wrapper exposes with a local interface.
interface GiftLinkModel {
    get(key: string): unknown;
    toJSON?: () => Record<string, unknown>;
}

interface GiftLinksApi {
    getActive(postId: string, options?: Record<string, unknown>): Promise<GiftLinkModel | null>;
    getActiveByToken(token: string, options?: Record<string, unknown>): Promise<GiftLinkModel | null>;
    ensure(postId: string, options?: Record<string, unknown>): Promise<GiftLinkModel>;
    reset(postId: string, options?: Record<string, unknown>): Promise<GiftLinkModel>;
    resetAll(options?: Record<string, unknown>): Promise<number>;
    recordRead(giftLinkId: string): Promise<number>;
}

// eslint-disable-next-line @typescript-eslint/no-require-imports
const GiftLinksService = require('./gift-links-service') as new (deps: {models: unknown}) => GiftLinksApi;

/**
 * Boot-time wrapper for the gift links service. Mirrors the comments /
 * recommendations service pattern: a singleton whose `init()` lazily wires in
 * the models so the module can be required without triggering model loading.
 */
class GiftLinksServiceWrapper {
    api?: GiftLinksApi;

    init(): void {
        if (this.api) {
            // Already initialised
            return;
        }

        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const models = require('../../models');

        this.api = new GiftLinksService({models});
    }

    get middleware(): unknown {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        return require('./middleware');
    }
}

// module.exports required - using `export` causes the module to fail to register
// with the web framework as it's loaded via require()
module.exports = new GiftLinksServiceWrapper();
