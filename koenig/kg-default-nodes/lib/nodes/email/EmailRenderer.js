import {addCreateDocumentOption} from '../../utils/add-create-document-option';

/**
 * Wraps our replacement strings (e.g. {foo}) in %% (e.g. %%{foo}%%)
 * This helps to prevent conflicts between code samples and our replacement strings
 * @param {*} html
 * @returns {string} html with replacement strings wrapped in %%
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

    const wrappedHtml = wrapReplacementStrings(html);
    const element = document.createElement('div');
    element.innerHTML = wrappedHtml;

    return element.firstElementChild;
}