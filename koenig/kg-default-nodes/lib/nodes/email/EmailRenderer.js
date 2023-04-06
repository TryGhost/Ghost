import {addCreateDocumentOption} from '../../utils/add-create-document-option';

export function renderEmailNodeToDOM(node, options = {}) {
    addCreateDocumentOption(options);
    const document = options.createDocument();

    const html = node.getHtml();

    if (!html || options.target !== 'email') {
        return document.createTextNode('');
    }

    const element = document.createElement('div');
    element.innerHTML = html;

    return element.firstElementChild;
}