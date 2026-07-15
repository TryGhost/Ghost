const errors = require('@tryghost/errors');

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_MODEL = 'claude-haiku-4-5';
const MAX_IMAGE_BYTES = 7500000;
const SUPPORTED_IMAGE_TYPES = new Set([
    'image/gif',
    'image/jpeg',
    'image/png',
    'image/webp'
]);
const PROMPT = 'Write one concise, accessibility-focused alt text description for this image. Describe the visible subject, action, and relevant context. Include visible text only when it is material. Do not use filler such as “image of” or “picture of”. Respond with only the alt text, without markdown, quotes, or a prefix.';

module.exports = class ImageAltTextService {
    /**
     * @param {object} deps
     * @param {{get: (key: string) => string | null | undefined}} deps.settingsCache
     * @param {(url: string, options: object) => Promise<{body: Buffer | string, statusCode?: number}>} deps.request
     * @param {(buffer: Buffer) => Promise<{mime: string} | undefined>} deps.getFileTypeFromBuffer
     * @param {() => string} deps.getSiteUrl
     */
    constructor({settingsCache, request, getFileTypeFromBuffer, getSiteUrl}) {
        this.settingsCache = settingsCache;
        this.request = request;
        this.getFileTypeFromBuffer = getFileTypeFromBuffer;
        this.getSiteUrl = getSiteUrl;
    }

    /**
     * @param {string} imageUrl
     * @returns {Promise<string>}
    */
    async generate(imageUrl) {
        // secretlint-disable-next-line @secretlint/secretlint-rule-pattern
        const apiKey = this.settingsCache.get('claude_api_key');

        if (!apiKey) {
            throw new errors.ValidationError({
                message: 'Claude API key is not configured.'
            });
        }

        const normalizedUrl = this.#normalizeImageUrl(imageUrl);
        const {buffer, mediaType} = await this.#downloadImage(normalizedUrl);

        return this.#requestAltText({apiKey, buffer, mediaType});
    }

    /** @private */
    #normalizeImageUrl(imageUrl) {
        if (typeof imageUrl !== 'string' || !imageUrl.trim()) {
            throw new errors.ValidationError({
                message: 'A valid Ghost image URL is required.'
            });
        }

        let parsedUrl;
        try {
            parsedUrl = new URL(imageUrl, this.getSiteUrl());
        } catch {
            throw new errors.ValidationError({
                message: 'A valid Ghost image URL is required.'
            });
        }

        const isHttp = parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:';
        const isGhostImage = parsedUrl.pathname.includes('/content/images/');
        if (!isHttp || !isGhostImage) {
            throw new errors.ValidationError({
                message: 'A valid Ghost image URL is required.'
            });
        }

        return parsedUrl.href;
    }

    /** @private */
    async #downloadImage(imageUrl) {
        let response;
        try {
            response = await this.request(imageUrl, {
                followRedirect: true,
                maxResponseSize: MAX_IMAGE_BYTES,
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

    /** @private */
    async #requestAltText({apiKey, buffer, mediaType}) {
        try {
            const response = await this.request(ANTHROPIC_API_URL, {
                method: 'POST',
                headers: {
                    'anthropic-version': '2023-06-01',
                    'content-type': 'application/json',
                    'x-api-key': apiKey
                },
                body: JSON.stringify({
                    model: ANTHROPIC_MODEL,
                    max_tokens: 300,
                    messages: [{
                        role: 'user',
                        content: [{
                            type: 'image',
                            source: {
                                type: 'base64',
                                media_type: mediaType,
                                data: buffer.toString('base64')
                            }
                        }, {
                            type: 'text',
                            text: PROMPT
                        }]
                    }]
                }),
                retry: {limit: 0},
                timeout: {request: 30000}
            });
            const result = JSON.parse(response.body);
            const altText = result.content?.find(block => block.type === 'text')?.text?.trim();

            if (!altText) {
                throw new errors.InternalServerError({
                    message: 'Claude returned no text content.'
                });
            }

            return altText;
        } catch {
            throw new errors.InternalServerError({
                message: 'Claude could not generate alt text.'
            });
        }
    }
};
