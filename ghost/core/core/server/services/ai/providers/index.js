const AnthropicProvider = require('./anthropic-provider');

/**
 * Registry of supported AI providers, keyed by the slug stored in the
 * `ai_provider` setting. Adding a new provider (e.g. OpenAI, Gemini) means
 * adding one entry here plus its own `ai_<slug>_api_key` setting - no changes
 * are needed in the services or features that consume providers.
 */
const PROVIDERS = {
    [AnthropicProvider.slug]: AnthropicProvider
};

/**
 * @param {string} slug
 * @returns {typeof AnthropicProvider | undefined}
 */
function getProviderClass(slug) {
    return PROVIDERS[slug];
}

/**
 * @returns {string[]}
 */
function getSupportedProviderSlugs() {
    return Object.keys(PROVIDERS);
}

module.exports = {
    getProviderClass,
    getSupportedProviderSlugs
};
