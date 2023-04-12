import {addCreateDocumentOption} from '../../utils/add-create-document-option';

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
    return html.replace(/\{(\w*?)(?:,? *"(.*?)")?\}/g, '%%$&%%');
}

export function renderEmailNodeToDOM(node, options = {}) {
    addCreateDocumentOption(options);
    const document = options.createDocument();

    const html = node.getHtml();

    if (!html || options.target !== 'email') {
        return document.createTextNode('');
    }

    const cleanedHtml = wrapReplacementStrings(removeSpaces(html));
    const div = document.createElement('div');
    div.innerHTML = cleanedHtml;

    return div;
}