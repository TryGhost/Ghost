import {addCreateDocumentOption} from '../../utils/add-create-document-option';
import {removeSpaces, wrapReplacementStrings} from '../../utils/replacement-strings';

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