import {addCreateDocumentOption} from '../../utils/add-create-document-option';

export function renderHtmlNodeToDOM(node, options = {}) {
    addCreateDocumentOption(options);

    const document = options.createDocument();

    const html = node.getHtml() || '';

    if (html) {
        const textarea = document.createElement('textarea');
        textarea.innerHTML = html;

        return {element: textarea, type: 'value'};
    } else {
        return {element: document.createElement('div'), type: 'inner'};
    }
}
