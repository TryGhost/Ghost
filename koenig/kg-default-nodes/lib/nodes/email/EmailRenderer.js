import {addCreateDocumentOption} from '../../utils/add-create-document-option';

/**
 * Wraps our replacement strings (e.g. {foo}) in %% (e.g. %%{foo}%%)
 * This helps to prevent conflicts between code samples and our replacement strings
 * @param {string} html
 * @returns {string}
 */
function wrapReplacementStrings(html) {
    return html.replace(/\{(\w*?)(?:,? *"(.*?)")?\}/g, '%%$&%%');
}

/**
 * Removes any <code> wrappers around our replacement strings
 * Example: <code>{foo}</code> -> <span>{foo}</span>
 * @param {string} html
 * @returns {string}
 */
function removeCodeWrappers(html) {
    return html.replace(/<code>(<span>{.*?}<\/span>)<\/code>/gi, '$1');
}

/**
 * Removes any whitespaces or newlines from the input
 * @param {string} html
 * @returns {string}
 */
function removeSpaces(html) {
    return html.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
}

export function renderEmailNodeToDOM(node, options = {}) {
    addCreateDocumentOption(options);
    const document = options.createDocument();

    const html = node.getHtml();

    if (!html || options.target !== 'email') {
        return document.createTextNode('');
    }

    const cleanedHtml = removeSpaces(wrapReplacementStrings(removeCodeWrappers(html)));
    const element = document.createElement('div');
    element.innerHTML = cleanedHtml;

    return element.firstElementChild;
}