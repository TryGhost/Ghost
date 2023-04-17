/**
 * Removes consecutive whitespaces and newlines
 * @param {string} html
 * @returns {string}
 */
export function removeSpaces(html) {
    return html.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
}

/**
 * Wraps replacement strings with %%
 * This helps to prevent conflicts between code samples and our replacement strings
 * Example: {foo} -> %%{foo}%%
 * @param {string} html
 * @returns {string}
 */
export function wrapReplacementStrings(html) {
    return html.replace(/\{(\w*?)(?:,? *"(.*?)")?\}/g, '%%$&%%');
}