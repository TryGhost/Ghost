const errors = require('@tryghost/errors');
const {buildAltTextPrompt} = require('./prompts/alt-text');

const MAX_IMAGE_BYTES = 7500000;
const SUPPORTED_IMAGE_TYPES = new Set([
    'image/gif',
    'image/jpeg',
    'image/png',
    'image/webp'
]);

/**
 * Orchestrates AI-backed editor features (today: image alt text). Knows
 * nothing about any specific vendor - it resolves whichever provider is
 * configured via settings and delegates the actual model call to it.
 *
 * Adding a new AI-driven feature (e.g. excerpt generation) means adding a
 * method here that calls `this.#getProvider()` and a capability method on
 * the provider - it does not require a new service, settings group, or API
 * shape.
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
     * @returns {boolean} whether an AI provider is configured and usable
     */
    get isConfigured() {
        return Boolean(this.#getConfiguredProvider());
    }

    /**
     * @param {string} imageUrl
     * @returns {Promise<string>}
     */
    async generateImageAltText(imageUrl) {
        const provider = this.#getProvider();

        const normalizedUrl = this.#normalizeImageUrl(imageUrl);
        const {buffer, mediaType} = await this.#downloadImage(normalizedUrl);

        const prompt = buildAltTextPrompt({locale: this.getLocale()});

        return provider.describeImage({image: buffer, mediaType, prompt});
    }

    /** @private */
    #getConfiguredProvider() {
        const slug = this.settingsCache.get('ai_provider');
        if (!slug) {
            return null;
        }

        const ProviderClass = this.providers.getProviderClass(slug);
        if (!ProviderClass) {
            return null;
        }

        // secretlint-disable-next-line @secretlint/secretlint-rule-pattern
        const apiKey = this.settingsCache.get(`ai_${slug}_api_key`);
        if (!apiKey) {
            return null;
        }

        return new ProviderClass({apiKey, request: this.request});
    }

    /** @private */
    #getProvider() {
        const provider = this.#getConfiguredProvider();

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
