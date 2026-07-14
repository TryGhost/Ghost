const errors = require('@tryghost/errors');

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_VERSION = '2023-06-01';
const DEFAULT_MODEL = 'claude-haiku-4-5';
const DEFAULT_MAX_TOKENS = 300;

/**
 * Thin wrapper around Anthropic's Messages API. Only exposes the capabilities
 * this provider actually supports today (single-turn vision-to-text), so
 * callers can't accidentally depend on Anthropic-specific request/response shapes.
 */
module.exports = class AnthropicProvider {
    static slug = 'anthropic';

    /** @type {ReadonlySet<string>} */
    static capabilities = new Set(['vision-to-text']);

    /**
     * @param {object} deps
     * @param {string} deps.apiKey
     * @param {(url: string, options: object) => Promise<{body: Buffer | string, statusCode?: number}>} deps.request
     * @param {string} [deps.model]
     */
    constructor({apiKey, request, model = DEFAULT_MODEL}) {
        if (!apiKey) {
            throw new errors.IncorrectUsageError({
                message: 'AnthropicProvider requires an apiKey.'
            });
        }

        this.apiKey = apiKey;
        this.request = request;
        this.model = model;
    }

    /**
     * Sends a single image + text prompt to Claude and returns the generated text.
     *
     * @param {object} params
     * @param {Buffer} params.image
     * @param {string} params.mediaType
     * @param {string} params.prompt
     * @returns {Promise<string>}
     */
    async describeImage({image, mediaType, prompt}) {
        let response;

        try {
            response = await this.request(ANTHROPIC_API_URL, {
                method: 'POST',
                headers: {
                    'anthropic-version': ANTHROPIC_VERSION,
                    'content-type': 'application/json',
                    // secretlint-disable-next-line @secretlint/secretlint-rule-pattern
                    'x-api-key': this.apiKey
                },
                body: JSON.stringify({
                    model: this.model,
                    max_tokens: DEFAULT_MAX_TOKENS,
                    messages: [{
                        role: 'user',
                        content: [{
                            type: 'image',
                            source: {
                                type: 'base64',
                                media_type: mediaType,
                                data: image.toString('base64')
                            }
                        }, {
                            type: 'text',
                            text: prompt
                        }]
                    }]
                }),
                throwHttpErrors: false,
                retry: {limit: 0},
                timeout: {request: 30000}
            });
        } catch (err) {
            throw new errors.InternalServerError({
                message: 'Could not reach the Anthropic API.',
                err
            });
        }

        this.#assertSuccessResponse(response);

        let result;
        try {
            result = JSON.parse(response.body);
        } catch (err) {
            throw new errors.InternalServerError({
                message: 'Anthropic returned an unreadable response.',
                err
            });
        }

        const text = result.content?.find(block => block.type === 'text')?.text?.trim();

        if (!text) {
            throw new errors.InternalServerError({
                message: 'Anthropic returned no text content.'
            });
        }

        return text;
    }

    /** @private */
    #assertSuccessResponse(response) {
        const statusCode = response.statusCode;

        if (!statusCode || statusCode < 400) {
            return;
        }

        if (statusCode === 401 || statusCode === 403) {
            throw new errors.NoPermissionError({
                message: 'Your Anthropic API key is invalid, or does not have permission to use this model.'
            });
        }

        if (statusCode === 429) {
            throw new errors.TooManyRequestsError({
                message: 'The Anthropic API rate limit was reached. Please try again shortly.'
            });
        }

        if (statusCode >= 500) {
            throw new errors.InternalServerError({
                message: 'The Anthropic API is temporarily unavailable. Please try again shortly.'
            });
        }

        throw new errors.ValidationError({
            message: 'The Anthropic API rejected the request.'
        });
    }
};
