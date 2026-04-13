/**
 * Removes consecutive whitespaces and newlines
 * @param {string} html
 * @returns {string}
 */
function removeSpaces(html) {
    return html.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
}

/**
 * Wraps replacement strings with %%
 * This helps to prevent conflicts between code samples and our replacement strings
 * Example: {foo} -> %%{foo}%%
 * @param {string} html
 * @returns {string}
 */
function wrapReplacementStrings(html) {
    return html.replace(/\{(\w*?)(?:,? *"(.*?)")?\}/g, (token, _id, _fallback, offset, input) => {
        const hasLeadingPercents = input.slice(Math.max(0, offset - 2), offset) === '%%';
        const hasTrailingPercents = input.slice(offset + token.length, offset + token.length + 2) === '%%';

        if (hasLeadingPercents && hasTrailingPercents) {
            return token;
        }

        return `%%${token}%%`;
    });
}

/**
 * Removes any <code> wrappers around replacement strings {foo}
 * Example input:  <code><span>{foo}</span></code>
 * Example output:       <span>{foo}</span>
 * @param {string} html
 * @returns {string}
 */
function removeCodeWrappersFromHelpers(html, document) {
    // parse html to make patterns easier to match
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;

    const codeElements = tempDiv.querySelectorAll('code');
    codeElements.forEach((codeElement) => {
        const codeTextContent = codeElement.textContent;
        // extract the content of the code element if it follows the helper pattern (e.g. {foo})
        if (codeTextContent.match(/((.*?){.*?}(.*?))/gi)) {
            const codeContent = codeElement.innerHTML;
            codeElement.parentNode.replaceChild(document.createRange().createContextualFragment(codeContent), codeElement);
        }
    });

    const cleanedHtml = tempDiv.innerHTML;
    return cleanedHtml;
}

module.exports = {
    removeSpaces,
    wrapReplacementStrings,
    removeCodeWrappersFromHelpers
};
