import {addCreateDocumentOption} from '../../utils/add-create-document-option';

export function renderHtmlNodeToDOM(node, options = {}) {
    addCreateDocumentOption(options);

    const document = options.createDocument();

    const html = node.getHtml() || '';

    const div = document.createElement('div');

    div.innerHTML = html;

    return div;
}
