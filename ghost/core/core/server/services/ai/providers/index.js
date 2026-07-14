const AnthropicProvider = require('./anthropic-provider');

/**
 * Registry of supported AI providers, keyed by their slug. Each provider is
 * independently configured via its own `ai_<slug>_api_key` setting - there is
 * no global "active provider" toggle. The consuming service (see AIService)
 * picks a configured provider by capability, so multiple providers can be
 * connected simultaneously and different features can use different ones.
 *
 * Adding a new provider (e.g. OpenAI, Gemini) means: adding an entry here,
 * defining its `capabilities` set, and adding an `ai_<slug>_api_key` setting.
 * No changes are needed in AIService or in any feature that consumes it.
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
 * @returns {Array<{slug: string, ProviderClass: typeof AnthropicProvider}>}
 */
function listProviders() {
    return Object.entries(PROVIDERS).map(([slug, ProviderClass]) => ({slug, ProviderClass}));
}

/**
 * @returns {string[]}
 */
function getSupportedProviderSlugs() {
    return Object.keys(PROVIDERS);
}

module.exports = {
    getProviderClass,
    listProviders,
    getSupportedProviderSlugs
};
