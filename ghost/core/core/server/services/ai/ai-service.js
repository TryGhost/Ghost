const errors = require('@tryghost/errors');
const {buildAltTextPrompt} = require('./prompts/alt-text');

const MAX_IMAGE_BYTES = 7500000;
const SUPPORTED_IMAGE_TYPES = new Set([
    'image/gif',
    'image/jpeg',
    'image/png',
    'image/webp'
]);

const VISION_TO_TEXT = 'vision-to-text';

/**
 * Orchestrates AI-backed editor features (today: image alt text). Knows
 * nothing about any specific vendor - it resolves a provider by the
 * capability the feature needs and delegates the actual model call to it.
 *
 * Capability-based routing (rather than a global "active provider" setting)
 * means multiple providers can be connected simultaneously: each provider is
 * "active" whenever its own `ai_<slug>_api_key` setting is populated, and
 * different features can be served by different providers. When multiple
 * configured providers advertise the same capability, the first one in
 * `providers.listProviders()` wins - a per-feature override could be layered
 * on top later without changing this contract.
 *
 * Adding a new AI-driven feature (e.g. excerpt generation) means: (1) adding
 * a method here that resolves a provider for the required capability, and
 * (2) declaring that capability on any provider that supports it. It does
 * not require a new service, settings group, or API shape.
 */
module.exports = class AIService {
    /**
     * @param {object} deps
     * @param {{get: (key: string) => string | null | undefined}} deps.settingsCache
     * @param {(url: string, options: object) => Promise<{body: Buffer | string, statusCode?: number}>} deps.request
     * @param {(buffer: Buffer) => Promise<{mime: string} | undefined>} deps.getFileTypeFromBuffer
     * @param {() => string} deps.getSiteUrl
     * @param {() => string | undefined} [deps.getLocale]
     * @param {import('./providers')} deps.providers
     */
    constructor({settingsCache, request, getFileTypeFromBuffer, getSiteUrl, getLocale, providers}) {
        this.settingsCache = settingsCache;
        this.request = request;
        this.getFileTypeFromBuffer = getFileTypeFromBuffer;
        this.getSiteUrl = getSiteUrl;
        this.getLocale = getLocale || (() => undefined);
        this.providers = providers;
    }

    /**
     * @returns {boolean} whether a provider is configured for image alt text
     *
     * Retained as the single admin-facing "is AI usable?" signal because
     * image alt text is currently the only AI-backed feature. When a second
     * feature is added, this getter should be replaced by capability-specific
     * getters (e.g. `hasVisionToText`, `hasTextGeneration`) so the admin UI
     * can enable each feature independently.
     */
    get isConfigured() {
        return Boolean(this.#resolveProviderForCapability(VISION_TO_TEXT));
    }

    /**
     * @param {string} imageUrl
     * @returns {Promise<string>}
     */
    async generateImageAltText(imageUrl) {
        const provider = this.#getProviderForCapability(VISION_TO_TEXT);

        const normalizedUrl = this.#normalizeImageUrl(imageUrl);
        const {buffer, mediaType} = await this.#downloadImage(normalizedUrl);

        const prompt = buildAltTextPrompt({locale: this.getLocale()});

        return provider.describeImage({image: buffer, mediaType, prompt});
    }

    /**
     * Resolves the first configured provider that advertises the requested
     * capability, or `null` if none is available.
     * @private
     * @param {string} capability
     */
    #resolveProviderForCapability(capability) {
        for (const {slug, ProviderClass} of this.providers.listProviders()) {
            if (!ProviderClass.capabilities?.has(capability)) {
                continue;
            }

            // secretlint-disable-next-line @secretlint/secretlint-rule-pattern
            const apiKey = this.settingsCache.get(`ai_${slug}_api_key`);
            if (!apiKey) {
                continue;
            }

            return new ProviderClass({apiKey, request: this.request});
        }

        return null;
    }

    /** @private */
    #getProviderForCapability(capability) {
        const provider = this.#resolveProviderForCapability(capability);

        if (!provider) {
            throw new errors.ValidationError({
                message: 'An AI provider is not configured.'
            });
        }

        return provider;
    }

    /** @private */
    #normalizeImageUrl(imageUrl) {
        const invalidUrlMessage = 'A valid image URL (site-relative or absolute, served under /content/images/) is required.';

        if (typeof imageUrl !== 'string' || !imageUrl.trim()) {
            throw new errors.ValidationError({message: invalidUrlMessage});
        }

        let parsedUrl;
        try {
            // Absolute URLs (including third-party CDNs fronting Ghost's own
            // image storage) are accepted as-is; site-relative paths are
            // resolved against the configured site URL.
            parsedUrl = new URL(imageUrl, this.getSiteUrl());
        } catch {
            throw new errors.ValidationError({message: invalidUrlMessage});
        }

        const isHttp = parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:';
        const isImagePath = parsedUrl.pathname.includes('/content/images/');
        if (!isHttp || !isImagePath) {
            throw new errors.ValidationError({message: invalidUrlMessage});
        }

        return parsedUrl.href;
    }

    /** @private */
    async #downloadImage(imageUrl) {
        let response;
        try {
            response = await this.request(imageUrl, {
                followRedirect: true,
                responseType: 'buffer',
                retry: {limit: 0},
                timeout: {request: 10000}
            });
        } catch (err) {
            throw new errors.BadRequestError({
                message: 'Ghost could not download the image.',
                err
            });
        }

        const buffer = response.body;

        if (Buffer.isBuffer(buffer) && buffer.length > MAX_IMAGE_BYTES) {
            throw new errors.BadRequestError({
                message: 'The image is too large to generate alt text for.'
            });
        }

        const fileType = Buffer.isBuffer(buffer) ? await this.getFileTypeFromBuffer(buffer) : undefined;
        if (!fileType || !SUPPORTED_IMAGE_TYPES.has(fileType.mime)) {
            throw new errors.BadRequestError({
                message: 'The URL did not return a supported image.'
            });
        }

        return {
            buffer,
            mediaType: fileType.mime
        };
    }
};
