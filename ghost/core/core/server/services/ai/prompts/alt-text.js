const BASE_PROMPT = 'Write one concise, accessibility-focused alt text description for this image. ' +
    'Describe the visible subject, action, and relevant context. Include visible text only when it is material. ' +
    'Do not use filler such as "image of" or "picture of". ' +
    'Respond with only the alt text, without markdown, quotes, or a prefix.';

/**
 * @param {object} [options]
 * @param {string} [options.locale] - e.g. 'fr', used to ask the model to reply in the site's language
 * @returns {string}
 */
function buildAltTextPrompt({locale} = {}) {
    if (!locale || locale.startsWith('en')) {
        return BASE_PROMPT;
    }

    return `${BASE_PROMPT} Respond in the language with locale code "${locale}".`;
}

module.exports = {
    buildAltTextPrompt
};
